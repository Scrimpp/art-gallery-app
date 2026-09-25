import { headers } from "next/headers";
import { signOutAction } from "@/app/actions";
import { GalleryGrid } from "@/components/gallery-grid";
import { SubmissionForm } from "@/components/submission-form";
import { TwitterLoginButton } from "@/components/twitter-login-button";
import { getIdentitySnapshot } from "@/lib/auth";
import {
  CLEAN_DOWNLOAD_BUCKET,
  SIGNED_URL_TTL_SECONDS,
} from "@/lib/constants";
import { env, isSupabaseConfigured } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  DEFAULT_MINT_FEE_CENTS,
  calculateProceedsBreakdown,
  formatMintFeeRange,
  formatUsd,
} from "@/lib/treasury";
import type { GallerySubmission, TreasurySummary } from "@/lib/types";
import { buildOriginFromHeaders, buildXShareUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
};

type ResolvedSearchParams = Record<string, string | string[] | undefined> | undefined;

const flashMessages = {
  signed_in: {
    type: "success",
    text: "You're signed in with X — your Garden submission form is ready.",
  },
  signed_out: {
    type: "success",
    text: "You have been signed out.",
  },
  auth_config_missing: {
    type: "error",
    text: "Add your Supabase credentials before enabling X login.",
  },
  oauth_start_failed: {
    type: "error",
    text: "We couldn't start the X login flow. Double-check your Supabase provider settings.",
  },
  oauth_callback_failed: {
    type: "error",
    text: "The X login callback failed. Verify your redirect URLs in Supabase and the X developer portal.",
  },
  profile_sync_failed: {
    type: "error",
    text: "Your X account signed in, but the artist profile could not be saved. Try the login flow again after checking your Supabase schema.",
  },
} as const;

type ClaimRecord = {
  email: string | null;
  fee_cents: number | null;
  status: string | null;
  submission_id: string;
};

function getFlash(searchParams: ResolvedSearchParams) {
  const rawMessage = searchParams?.message;
  const rawError = searchParams?.error;
  const key =
    (typeof rawMessage === "string" && rawMessage) ||
    (typeof rawError === "string" && rawError) ||
    "";

  if (!key || !(key in flashMessages)) {
    return null;
  }

  return flashMessages[key as keyof typeof flashMessages];
}

function normalizeTreasury(data: Record<string, unknown> | null): TreasurySummary | null {
  if (!data) {
    return null;
  }

  return {
    totalMints: Number(data.total_mints ?? 0),
    totalReservations: Number(data.total_reservations ?? 0),
    revenueCents: Number(data.revenue_cents ?? 0),
    pipelineCents: Number(data.pipeline_cents ?? 0),
  };
}

function normalizeSubmissions(
  data: Array<Record<string, unknown>> | null,
  claims: Map<string, ClaimRecord>,
  cleanDownloadUrls: Map<string, string>,
  currentUserId: string | null,
  origin: string,
) {
  if (!data) {
    return [];
  }

  return data.map((entry) => {
    const userRecord =
      entry.user && typeof entry.user === "object"
        ? (entry.user as Record<string, unknown>)
        : null;
    const submissionId = String(entry.id ?? "");
    const claim = claims.get(submissionId);

    return {
      id: submissionId,
      title: String(entry.title ?? ""),
      description: String(entry.description ?? ""),
      mood: String(entry.mood ?? ""),
      imageUrl: String(entry.image_url ?? ""),
      createdAt: String(entry.created_at ?? ""),
      userId: String(entry.user_id ?? ""),
      isOwnedByViewer: currentUserId === String(entry.user_id ?? ""),
      cleanDownloadUrl: cleanDownloadUrls.get(submissionId) ?? null,
      claimStatus:
        claim?.status === "reserved" || claim?.status === "minted"
          ? claim.status
          : "none",
      reservationEmail: claim?.email ?? null,
      mintFeeCents: Number(
        entry.mint_fee_cents ?? claim?.fee_cents ?? DEFAULT_MINT_FEE_CENTS,
      ),
      xShareUrl: buildXShareUrl(String(entry.title ?? "this piece"), origin, submissionId),
      user: {
        username: String(userRecord?.username ?? "unknown"),
        displayName: String(userRecord?.display_name ?? "Anonymous Artist"),
        profilePictureUrl:
          typeof userRecord?.profile_picture_url === "string"
            ? userRecord.profile_picture_url
            : null,
      },
    } satisfies GallerySubmission;
  });
}

async function loadGalleryData(origin: string) {
  if (!isSupabaseConfigured) {
    return {
      profile: null,
      treasury: null,
      user: null,
      submissions: [] as GallerySubmission[],
    };
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      profile: null,
      treasury: null,
      user: null,
      submissions: [] as GallerySubmission[],
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? getIdentitySnapshot(user) : null;
  const isAdmin =
    Boolean(profile?.username) &&
    Boolean(env.gardenAdminUsername) &&
    profile?.username.toLowerCase() === env.gardenAdminUsername;

  const [
    { data: submissions },
    { data: claims },
    { data: treasury },
  ] = await Promise.all([
    supabase
      .from("submissions")
      .select(
        "id, user_id, title, description, mood, image_url, clean_image_path, mint_fee_cents, created_at, user:users!submissions_user_id_fkey!inner(username, display_name, profile_picture_url)",
      )
      .order("created_at", { ascending: false }),
    user
      ? supabase
          .from("submission_claims")
          .select("submission_id, status, email, fee_cents")
          .eq("user_id", user.id)
      : Promise.resolve({ data: null }),
    isAdmin
      ? supabase
          .from("treasury_totals")
          .select("total_mints, total_reservations, revenue_cents, pipeline_cents")
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const claimMap = new Map<string, ClaimRecord>();

  for (const claim of (claims as ClaimRecord[] | null) ?? []) {
    claimMap.set(String(claim.submission_id), claim);
  }

  const cleanDownloadUrls = new Map<string, string>();

  if (user && submissions) {
    const ownedClaimedSubmissions = submissions.filter((entry) => {
      const claim = claimMap.get(String(entry.id ?? ""));

      return (
        String(entry.user_id ?? "") === user.id &&
        (claim?.status === "reserved" || claim?.status === "minted") &&
        typeof entry.clean_image_path === "string" &&
        entry.clean_image_path
      );
    });

    if (ownedClaimedSubmissions.length > 0) {
      const { data: signedUrls } = await supabase.storage
        .from(CLEAN_DOWNLOAD_BUCKET)
        .createSignedUrls(
          ownedClaimedSubmissions.map((entry) => String(entry.clean_image_path ?? "")),
          SIGNED_URL_TTL_SECONDS,
        );

      signedUrls?.forEach((entry, index) => {
        const submissionId = String(ownedClaimedSubmissions[index]?.id ?? "");

        if (submissionId && entry?.signedUrl) {
          cleanDownloadUrls.set(submissionId, entry.signedUrl);
        }
      });
    }
  }

  return {
    user,
    profile,
    treasury: normalizeTreasury(treasury as Record<string, unknown> | null),
    submissions: normalizeSubmissions(
      submissions as Array<Record<string, unknown>> | null,
      claimMap,
      cleanDownloadUrls,
      user?.id ?? null,
      origin,
    ),
  };
}

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const flash = getFlash(resolvedSearchParams);
  const headerList = await headers();
  const origin = buildOriginFromHeaders(headerList);
  const { user, profile, submissions, treasury } = await loadGalleryData(origin);
  const realizedBreakdown = treasury
    ? calculateProceedsBreakdown(treasury.revenueCents)
    : [];
  const pipelineBreakdown = treasury
    ? calculateProceedsBreakdown(treasury.pipelineCents)
    : [];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-12 px-5 py-8 sm:px-8 lg:px-12">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="space-y-6">
          <div className="inline-flex rounded-full border border-[color:var(--border)] bg-[color:var(--accent-soft)] px-4 py-2 text-xs uppercase tracking-[0.35em] text-amber-200/80">
            Garden
          </div>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-semibold text-white sm:text-5xl lg:text-6xl">
              A dark, living garden for art that says more than words can hold.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-stone-300 sm:text-lg">
              Sign in with X, upload your work to protected Supabase storage, and
              let the newest pieces bloom to the top with watermarked previews and
              claim-ready mint access.
            </p>
          </div>
          <div className="grid gap-4 text-sm text-stone-400 sm:grid-cols-3">
            <div className="rounded-2xl border border-[color:var(--border)] bg-white/5 p-4">
              <p className="text-2xl font-semibold text-[color:var(--accent)]">10MB</p>
              <p className="mt-1">Upload limit for JPG, PNG, and GIF artwork.</p>
            </div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-white/5 p-4">
              <p className="text-2xl font-semibold text-[color:var(--accent)]">
                {formatMintFeeRange()}
              </p>
              <p className="mt-1">
                Garden mint target range, with each piece storing its own configured fee.
              </p>
            </div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-white/5 p-4">
              <p className="text-2xl font-semibold text-[color:var(--accent)]">
                24 hours
              </p>
              <p className="mt-1">Signed clean-download access after reservation.</p>
            </div>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-[color:var(--border)] bg-black/40 p-6 shadow-2xl shadow-black/20 backdrop-blur">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.3em] text-stone-400">
              Artist access
            </p>
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">
                {user ? `Welcome back, ${profile?.displayName ?? "artist"}.` : "Step into Garden."}
              </h2>
              <p className="text-sm leading-6 text-stone-400">
                {user
                  ? "Your session is active. Share a new piece below, then open its claim flow to reserve the mint and unlock the clean download."
                  : "Connect your X account to unlock submissions, protected downloads, and future mint reservations."}
              </p>
            </div>

            {flash ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  flash.type === "success"
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
                    : "border-rose-500/25 bg-rose-500/10 text-rose-100"
                }`}
              >
                {flash.text}
              </div>
            ) : null}

            {!isSupabaseConfigured ? (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
                Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable authentication,
                uploads, claim reservations, and protected downloads.
              </div>
            ) : user ? (
              <div className="space-y-4 rounded-2xl border border-[color:var(--border)] bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  {profile?.profilePictureUrl ? (
                    <img
                      alt={profile.displayName}
                      className="h-12 w-12 rounded-full border border-[color:var(--border)] object-cover"
                      src={profile.profilePictureUrl}
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--accent-soft)] text-lg font-semibold text-[color:var(--accent)]">
                      {(profile?.displayName ?? "A").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-white">{profile?.displayName}</p>
                    <p className="text-sm text-stone-400">@{profile?.username}</p>
                  </div>
                </div>
                <form action={signOutAction}>
                  <button
                    className="w-full rounded-full border border-[color:var(--border)] px-4 py-3 text-sm font-medium text-stone-200 transition hover:border-[color:var(--accent)] hover:text-white"
                    type="submit"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            ) : (
              <TwitterLoginButton />
            )}
          </div>
        </aside>
      </section>

      {user ? <SubmissionForm /> : null}

      {treasury ? (
        <section className="rounded-[2rem] border border-[color:var(--border)] bg-black/35 p-6 shadow-2xl shadow-black/20 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-stone-500">
                Admin dashboard
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-white">
                Garden treasury tracking
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-stone-400">
              Track how many pieces have been reserved for minting, how many have
              been fully minted later, plus both realized revenue and the current
              reservation pipeline value.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[color:var(--border)] bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.25em] text-stone-500">Total mints</p>
              <p className="mt-3 text-3xl font-semibold text-white">{treasury.totalMints}</p>
            </div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.25em] text-stone-500">
                Total reservations
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {treasury.totalReservations}
              </p>
            </div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.25em] text-stone-500">Revenue</p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {formatUsd(treasury.revenueCents)}
              </p>
              <p className="mt-2 text-xs leading-5 text-stone-500">
                Pipeline value {formatUsd(treasury.pipelineCents)}
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-2xl border border-[color:var(--border)] bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.25em] text-stone-500">
                Mint proceeds policy
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-white">
                Transparent splits on every Garden mint
              </h3>
              <p className="mt-3 text-sm leading-6 text-stone-400">
                Every mint routes 40% directly to the original artist, with the
                remaining 60% split across the Garden treasury, liquidity, curation
                rewards, and platform maintenance.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {realizedBreakdown.map((split, index) => (
                <div
                  className="rounded-2xl border border-[color:var(--border)] bg-white/5 p-5"
                  key={split.key}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-white">{split.label}</p>
                      <p className="mt-1 text-sm leading-5 text-stone-400">
                        {split.description}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-[color:var(--accent)]">
                      {split.percentageLabel}
                    </p>
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3 text-stone-300">
                      <span>Realized</span>
                      <span className="font-medium text-white">
                        {formatUsd(split.amountCents)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-stone-400">
                      <span>Pipeline</span>
                      <span className="font-medium text-stone-200">
                        {formatUsd(pipelineBreakdown[index]?.amountCents ?? 0)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-stone-500">
              Latest submissions
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-white">
              Freshly grown artwork
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-stone-400">
            Every public card shows a watermarked preview, while creators can claim
            their own pieces to unlock clean, signed downloads from protected storage.
          </p>
        </div>
        <GalleryGrid submissions={submissions} />
      </section>
    </main>
  );
}
