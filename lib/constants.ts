export const MOODS = [
  "ethereal",
  "raw",
  "dark",
  "vibrant",
  "peaceful",
] as const;

export const PUBLIC_PREVIEW_BUCKET = "art-submissions";
export const CLEAN_DOWNLOAD_BUCKET = "art-originals";
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_TITLE_LENGTH = 120;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MINT_FEE_CENTS = 1200;
export const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
] as const;

export const moodStyles: Record<string, string> = {
  ethereal: "border-violet-300/30 bg-violet-300/10 text-violet-100",
  raw: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  dark: "border-stone-300/20 bg-stone-300/10 text-stone-200",
  vibrant: "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-100",
  peaceful: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
};
