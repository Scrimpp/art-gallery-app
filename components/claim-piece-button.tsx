"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { reserveArtwork } from "@/app/actions";
import { type ClaimStatus, initialClaimState } from "@/lib/types";

function ReserveButton({ claimed }: { claimed: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Saving..." : claimed ? "Update reservation" : "Reserve my piece"}
    </button>
  );
}

type ClaimPieceButtonProps = {
  claimStatus: ClaimStatus;
  cleanDownloadUrl: string | null;
  imageUrl: string;
  mintFeeCents: number;
  reservationEmail: string | null;
  submissionId: string;
  title: string;
  xShareUrl: string;
};

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function ClaimPieceButton({
  claimStatus,
  cleanDownloadUrl,
  imageUrl,
  mintFeeCents,
  reservationEmail,
  submissionId,
  title,
  xShareUrl,
}: ClaimPieceButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useFormState(reserveArtwork, initialClaimState);
  const isClaimed = claimStatus !== "none" || state.status === "success";
  const resolvedDownloadUrl = state.downloadUrl ?? cleanDownloadUrl;
  const helperText = useMemo(() => {
    if (state.message) {
      return state.message;
    }

    if (claimStatus === "reserved") {
      return "Your reservation is active. Update the email below if you want Garden to notify a different inbox, or resave it to refresh the clean download link.";
    }

    if (claimStatus === "minted") {
      return "Your piece is marked as minted. Clean downloads stay unlocked while the signed link is active.";
    }

    return "Reserve now to unlock the clean download while Garden finishes the full wallet mint flow.";
  }, [claimStatus, state.message]);

  return (
    <>
      <button
        className="rounded-full border border-[color:var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)] transition hover:bg-[color:var(--accent-soft)]"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        {isClaimed ? "Manage claim" : "Claim your piece"}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
          <div className="max-h-full w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--background-muted)] p-6 shadow-2xl shadow-black/30">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--accent)]">
                  Garden claim flow
                </p>
                <h3 className="text-2xl font-semibold text-white">{title}</h3>
                <p className="max-w-2xl text-sm leading-6 text-stone-400">{helperText}</p>
              </div>
              <button
                aria-label="Close claim flow"
                className="rounded-full border border-[color:var(--border)] px-3 py-2 text-sm text-stone-300 transition hover:border-[color:var(--accent)] hover:text-white"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="overflow-hidden rounded-[1.75rem] border border-[color:var(--border)] bg-black/35">
                <div className="relative">
                  <img alt={title} className="h-auto w-full object-cover" src={imageUrl} />
                  <div className="absolute left-4 top-4 rounded-full border border-[color:var(--border)] bg-black/60 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-[color:var(--accent)]">
                    Garden ✺ Preview
                  </div>
                </div>
                <div className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold text-white">{title}</p>
                    <p className="text-sm font-medium text-[color:var(--accent)]">
                      Mint fee {formatUsd(mintFeeCents)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[color:var(--border)] bg-white/5 p-4 text-sm leading-6 text-stone-300">
                    Once the full wallet flow launches, Garden will turn this reservation into a proper mint queue entry and notify you using the email you leave below.
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-[1.75rem] border border-[color:var(--border)] bg-black/25 p-5">
                <div className="rounded-2xl border border-[color:var(--border)] bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
                    Coming soon
                  </p>
                  <button
                    className="mt-3 w-full cursor-not-allowed rounded-full border border-stone-700 bg-stone-800/60 px-4 py-3 text-sm font-medium text-stone-500"
                    disabled
                    type="button"
                  >
                    Mint to X wallet
                  </button>
                </div>

                <form action={formAction} className="space-y-4 rounded-2xl border border-[color:var(--border)] bg-white/5 p-4">
                  <input name="submissionId" type="hidden" value={submissionId} />
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-200" htmlFor={`reserve-email-${submissionId}`}>
                      Reserve my piece
                    </label>
                    <input
                      className="w-full rounded-2xl border border-[color:var(--border)] bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-[color:var(--accent)]"
                      defaultValue={reservationEmail ?? ""}
                      id={`reserve-email-${submissionId}`}
                      name="email"
                      placeholder="collector@example.com"
                      required
                      type="email"
                    />
                    <p className="text-xs leading-5 text-stone-500">
                      We&apos;ll use this inbox for reservation updates and to unlock your clean download now.
                    </p>
                  </div>
                  <ReserveButton claimed={isClaimed} />
                </form>

                {resolvedDownloadUrl ? (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                    <p className="font-medium">Clean download unlocked.</p>
                    <p className="mt-2 leading-6 text-emerald-50/90">
                      This signed link expires in 24 hours, after which you can reopen this claim flow to generate a fresh one.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <a
                        className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-200"
                        href={resolvedDownloadUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Download clean version
                      </a>
                      <a
                        className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-medium text-stone-100 transition hover:border-[color:var(--accent)] hover:text-white"
                        href={xShareUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Share on X
                      </a>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
