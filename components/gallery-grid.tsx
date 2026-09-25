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
          key={submission.id}
        >
          <img
            alt={submission.title}
            className="h-auto w-full object-cover"
            src={submission.imageUrl}
          />
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
          </div>
        </article>
      ))}
    </div>
  );
}
