import { ClaimPieceButton } from "@/components/claim-piece-button";
import { moodStyles } from "@/lib/constants";
import type { GallerySubmission } from "@/lib/types";

export function GalleryGrid({
  submissions,
}: {
  submissions: GallerySubmission[];
}) {
  if (!submissions.length) {
    return (
      <div className="rounded-[2rem] border border-dashed border-[color:var(--border)] bg-black/20 px-6 py-16 text-center">
        <p className="text-lg font-medium text-white">The gallery is waiting for its first piece.</p>
        <p className="mt-3 text-sm leading-6 text-stone-400">
          Once Supabase is configured and an artist submits artwork, pieces will
          appear here in a responsive masonry grid.
        </p>
      </div>
    );
  }

  return (
    <div className="columns-1 gap-6 space-y-6 md:columns-2 xl:columns-3">
      {submissions.map((submission) => (
        <article
          className="mb-6 break-inside-avoid overflow-hidden rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--background-muted)] shadow-xl shadow-black/20"
          id={`submission-${submission.id}`}
          key={submission.id}
        >
          <div className="relative">
            <img
              alt={submission.title}
              className="h-auto w-full object-cover"
              src={submission.imageUrl}
            />
            <div className="absolute left-4 top-4 rounded-full border border-[color:var(--border)] bg-black/65 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-[color:var(--accent)]">
              Watermarked preview
            </div>
          </div>
          <div className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-white">{submission.title}</h3>
                <p className="mt-1 text-sm text-stone-400">@{submission.user.username}</p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${moodStyles[submission.mood] ?? "border-[color:var(--border)] text-stone-300"}`}
              >
                {submission.mood}
              </span>
            </div>
            <p className="text-sm leading-6 text-stone-300">{submission.description}</p>
            {submission.isOwnedByViewer ? (
              <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-white/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--accent)]">
                      Artist mint access
                    </p>
                    <p className="mt-2 text-sm leading-6 text-stone-400">
                      Reserve to unlock your clean download now, then come back for full wallet minting when Garden turns it on.
                    </p>
                  </div>
                  <ClaimPieceButton
                    claimStatus={submission.claimStatus}
                    cleanDownloadUrl={submission.cleanDownloadUrl}
                    imageUrl={submission.imageUrl}
                    mintFeeCents={submission.mintFeeCents}
                    reservationEmail={submission.reservationEmail}
                    submissionId={submission.id}
                    title={submission.title}
                    xShareUrl={submission.xShareUrl}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
