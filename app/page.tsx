import { GalleryGrid } from "@/components/gallery-grid";
import { SubmissionForm } from "@/components/submission-form";
import { TwitterLoginButton } from "@/components/twitter-login-button";
import { signOutAction } from "@/app/actions";
import { getIdentitySnapshot } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { GallerySubmission } from "@/lib/types";

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
    text: "You're signed in with X — your submission form is ready.",
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

function normalizeSubmissions(data: Array<Record<string, unknown>> | null) {
  if (!data) {
    return [];
  }

  return data.map((entry) => {
    const userRecord =
      entry.user && typeof entry.user === "object"
        ? (entry.user as Record<string, unknown>)
        : null;

    return {
      id: String(entry.id ?? ""),
      title: String(entry.title ?? ""),
      description: String(entry.description ?? ""),
      mood: String(entry.mood ?? ""),
      imageUrl: String(entry.image_url ?? ""),
      createdAt: String(entry.created_at ?? ""),
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

async function loadGalleryData() {
  if (!isSupabaseConfigured) {
    return {
      user: null,
      submissions: [] as GallerySubmission[],
    };
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      user: null,
      submissions: [] as GallerySubmission[],
    };
  }

  const [
    {
      data: { user },
    },
    { data: submissions },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("submissions")
      .select(
        "id, title, description, mood, image_url, created_at, user:users!submissions_user_id_fkey!inner(username, display_name, profile_picture_url)",
      )
      .order("created_at", { ascending: false }),
  ]);

  return {
    user,
    submissions: normalizeSubmissions(
      submissions as Array<Record<string, unknown>> | null,
    ),
  };
}

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const flash = getFlash(resolvedSearchParams);
  const { user, submissions } = await loadGalleryData();
  const profile = user ? getIdentitySnapshot(user) : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-12 px-5 py-8 sm:px-8 lg:px-12">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="space-y-6">
          <div className="inline-flex rounded-full border border-[color:var(--border)] bg-[color:var(--accent-soft)] px-4 py-2 text-xs uppercase tracking-[0.35em] text-amber-200/80">
            Mirror Gallery
          </div>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-semibold text-white sm:text-5xl lg:text-6xl">
              A dark, living gallery for art that says more than words can hold.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-stone-300 sm:text-lg">
              Sign in with X, upload your work to Supabase storage, and let the
              newest pieces rise to the top in a minimal masonry gallery.
            </p>
          </div>
          <div className="grid gap-4 text-sm text-stone-400 sm:grid-cols-3">
            <div className="rounded-2xl border border-[color:var(--border)] bg-white/5 p-4">
              <p className="text-2xl font-semibold text-[color:var(--accent)]">10MB</p>
              <p className="mt-1">Upload limit for JPG, PNG, and GIF artwork.</p>
            </div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-white/5 p-4">
              <p className="text-2xl font-semibold text-[color:var(--accent)]">5 moods</p>
              <p className="mt-1">Ethereal, raw, dark, vibrant, and peaceful.</p>
            </div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-white/5 p-4">
              <p className="text-2xl font-semibold text-[color:var(--accent)]">Supabase</p>
              <p className="mt-1">Auth, database, and public image delivery.</p>
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
                {user ? `Welcome back, ${profile?.displayName ?? "artist"}.` : "Step into the gallery."}
              </h2>
              <p className="text-sm leading-6 text-stone-400">
                {user
                  ? "Your session is active. Share a new piece below and it will appear in the feed immediately."
                  : "Connect your X account to unlock submissions and keep your artist identity attached to every piece."}
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
                uploads, and the live gallery data.
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

      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-stone-500">
              Latest submissions
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-white">
              Freshly mirrored artwork
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-stone-400">
            The gallery is sorted newest-first and designed to feel quiet, tactile,
            and intimate on every screen size.
          </p>
        </div>
        <GalleryGrid submissions={submissions} />
      </section>
    </main>
  );
}
