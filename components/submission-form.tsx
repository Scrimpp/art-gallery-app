"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { submitArtwork } from "@/app/actions";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  MOODS,
  moodStyles,
} from "@/lib/constants";
import { initialSubmissionState } from "@/lib/types";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? "Submitting..." : "Submit artwork"}
    </button>
  );
}

export function SubmissionForm() {
  const [state, formAction] = useFormState(submitArtwork, initialSubmissionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <section className="rounded-[2rem] border border-[color:var(--border)] bg-black/35 p-6 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="mb-6 space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Submission form</p>
        <h2 className="text-3xl font-semibold text-white">Share what your art says.</h2>
        <p className="max-w-2xl text-sm leading-6 text-stone-400">
          Upload a single image, name the piece, and pair it with the feeling it
          carries beyond language.
        </p>
      </div>

      <form
        action={formAction}
        className="grid gap-6 lg:grid-cols-[1fr_1fr]"
        encType="multipart/form-data"
        ref={formRef}
      >
        <div className="space-y-2 lg:col-span-2">
          <label className="text-sm font-medium text-stone-200" htmlFor="image">
            Artwork image
          </label>
          <input
            accept="image/jpeg,image/png,image/gif"
            className="block w-full rounded-2xl border border-[color:var(--border)] bg-white/5 px-4 py-3 text-sm text-stone-200 file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--accent)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black hover:file:brightness-110"
            id="image"
            name="image"
            required
            type="file"
          />
          <p className="text-xs text-stone-500">JPG, PNG, or GIF — 10MB max.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-stone-200" htmlFor="title">
            Title
          </label>
          <input
            className="w-full rounded-2xl border border-[color:var(--border)] bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-[color:var(--accent)]"
            id="title"
            maxLength={MAX_TITLE_LENGTH}
            name="title"
            placeholder="Name your piece"
            required
            type="text"
          />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium text-stone-200">Mood tag</span>
          <div className="flex flex-wrap gap-3">
            {MOODS.map((mood) => (
              <label
                className={`cursor-pointer rounded-full border px-4 py-2 text-sm capitalize transition hover:border-[color:var(--accent)] ${moodStyles[mood]}`}
                key={mood}
              >
                <input className="sr-only" name="mood" required type="radio" value={mood} />
                {mood}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2 lg:col-span-2">
          <label className="text-sm font-medium text-stone-200" htmlFor="description">
            What does your art say that words alone can&apos;t?
          </label>
          <textarea
            className="min-h-40 w-full rounded-3xl border border-[color:var(--border)] bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-[color:var(--accent)]"
            id="description"
            maxLength={MAX_DESCRIPTION_LENGTH}
            name="description"
            placeholder="Write the feeling, memory, contradiction, or silence behind the image."
            required
          />
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div
            className={`text-sm ${
              state.status === "error"
                ? "text-rose-300"
                : state.status === "success"
                  ? "text-emerald-300"
                  : "text-stone-500"
            }`}
          >
            {state.message || "Each submission is stored in Supabase and shown newest first."}
          </div>
          <SubmitButton />
        </div>
      </form>
    </section>
  );
}
