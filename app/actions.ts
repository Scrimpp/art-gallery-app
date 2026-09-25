"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { syncUserProfile } from "@/lib/auth";
import {
  ACCEPTED_IMAGE_TYPES,
  CLEAN_DOWNLOAD_BUCKET,
  MAX_DESCRIPTION_LENGTH,
  MAX_FILE_SIZE,
  MAX_TITLE_LENGTH,
  MOODS,
  PUBLIC_PREVIEW_BUCKET,
} from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DEFAULT_MINT_FEE_CENTS } from "@/lib/treasury";
import {
  type ClaimState,
  type SubmissionState,
  initialClaimState,
  initialSubmissionState,
} from "@/lib/types";

const moodSet = new Set(MOODS);

function sanitizeBaseName(value: string) {
  return value
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getFileExtension(contentType: string) {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function createWatermarkedSvg(
  encodedImage: string,
  contentType: string,
  title: string,
) {
  const encodedTitle = escapeXml(title.toUpperCase());
  const imageDataUrl = `data:${contentType};base64,${encodedImage}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 1400">
  <image href="${imageDataUrl}" x="0" y="0" width="1400" height="1400" preserveAspectRatio="xMidYMid slice" />
  <rect width="1400" height="1400" fill="rgba(7,7,7,0.12)" />
  <g transform="rotate(-24 700 700)" fill="rgba(212,175,55,0.22)" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="700" letter-spacing="12">
    <text x="-80" y="360">GARDEN ✺ ${encodedTitle} ✺ GARDEN ✺ ${encodedTitle} ✺ GARDEN</text>
    <text x="-120" y="700">GARDEN ✺ ${encodedTitle} ✺ GARDEN ✺ ${encodedTitle} ✺ GARDEN</text>
    <text x="-80" y="1040">GARDEN ✺ ${encodedTitle} ✺ GARDEN ✺ ${encodedTitle} ✺ GARDEN</text>
  </g>
  <g>
    <circle cx="1200" cy="180" r="72" fill="rgba(10,10,10,0.38)" stroke="rgba(212,175,55,0.88)" stroke-width="4" />
    <circle cx="1200" cy="180" r="36" fill="none" stroke="rgba(212,175,55,0.88)" stroke-width="8" />
    <path d="M1200 88v28M1200 244v28M1108 180h28M1264 180h28M1136 116l20 20M1244 224l20 20M1264 116l-20 20M1156 224l-20 20" stroke="rgba(212,175,55,0.88)" stroke-width="8" stroke-linecap="round" />
  </g>
</svg>`;
}

export async function submitArtwork(
  previousState: SubmissionState = initialSubmissionState,
  formData: FormData,
): Promise<SubmissionState> {
  void previousState;

  if (!isSupabaseConfigured) {
    return {
      status: "error",
      message: "Add your Supabase environment variables to enable submissions.",
    };
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      status: "error",
      message: "Supabase is unavailable right now. Try again in a moment.",
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      status: "error",
      message: "Sign in with X before sharing your artwork.",
    };
  }

  const syncError = await syncUserProfile(supabase, user);

  if (syncError) {
    return {
      status: "error",
      message: "We couldn't prepare your artist profile. Reconnect with X and try again.",
    };
  }

  const title = formData.get("title")?.toString().trim() ?? "";
  const description = formData.get("description")?.toString().trim() ?? "";
  const mood = formData.get("mood")?.toString().trim() ?? "";
  const image = formData.get("image");

  if (!title || title.length > MAX_TITLE_LENGTH) {
    return {
      status: "error",
      message: `Add a title up to ${MAX_TITLE_LENGTH} characters.`,
    };
  }

  if (!description || description.length > MAX_DESCRIPTION_LENGTH) {
    return {
      status: "error",
      message: `Add your reflection in ${MAX_DESCRIPTION_LENGTH} characters or fewer.`,
    };
  }

  if (!moodSet.has(mood as (typeof MOODS)[number])) {
    return {
      status: "error",
      message: "Choose one of the available mood tags.",
    };
  }

  if (!(image instanceof File) || image.size === 0) {
    return {
      status: "error",
      message: "Upload a JPG, PNG, or GIF before submitting.",
    };
  }

  if (!ACCEPTED_IMAGE_TYPES.includes(image.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return {
      status: "error",
      message: "Only JPG, PNG, and GIF files are supported.",
    };
  }

  if (image.size > MAX_FILE_SIZE) {
    return {
      status: "error",
      message: "Images must be 10MB or smaller.",
    };
  }

  const fileStem = `${Date.now()}-${sanitizeBaseName(image.name) || "artwork"}`;
  const imageExtension = getFileExtension(image.type);
  const cleanObjectPath = `${user.id}/clean/${fileStem}.${imageExtension}`;
  const previewObjectPath = `${user.id}/preview/${fileStem}.svg`;
  const encodedImage = Buffer.from(await image.arrayBuffer()).toString("base64");
  const watermarkedSvg = createWatermarkedSvg(encodedImage, image.type, title);

  const { error: cleanUploadError } = await supabase.storage
    .from(CLEAN_DOWNLOAD_BUCKET)
    .upload(cleanObjectPath, image, {
      contentType: image.type,
      upsert: false,
    });

  if (cleanUploadError) {
    return {
      status: "error",
      message: "We couldn't upload your artwork. Check your storage bucket settings and try again.",
    };
  }

  const { error: previewUploadError } = await supabase.storage
    .from(PUBLIC_PREVIEW_BUCKET)
    .upload(previewObjectPath, watermarkedSvg, {
      contentType: "image/svg+xml",
      upsert: false,
    });

  if (previewUploadError) {
    await supabase.storage.from(CLEAN_DOWNLOAD_BUCKET).remove([cleanObjectPath]);

    return {
      status: "error",
      message: "We couldn't prepare the watermarked preview for your artwork.",
    };
  }

  const { data: publicUrlData } = supabase.storage
    .from(PUBLIC_PREVIEW_BUCKET)
    .getPublicUrl(previewObjectPath);

  const { error: insertError } = await supabase.from("submissions").insert({
    user_id: user.id,
    title,
    description,
    mood,
    image_url: publicUrlData.publicUrl,
    clean_image_path: cleanObjectPath,
    mint_fee_cents: DEFAULT_MINT_FEE_CENTS,
  });

  if (insertError) {
    await Promise.all([
      supabase.storage.from(PUBLIC_PREVIEW_BUCKET).remove([previewObjectPath]),
      supabase.storage.from(CLEAN_DOWNLOAD_BUCKET).remove([cleanObjectPath]),
    ]);

    return {
      status: "error",
      message: "Your artwork was uploaded, but the gallery entry could not be saved.",
    };
  }

  revalidatePath("/");

  return {
    status: "success",
    message: "Artwork submitted — your Garden card is live, and you can claim it from the gallery below.",
  };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function reserveArtwork(
  previousState: ClaimState = initialClaimState,
  formData: FormData,
): Promise<ClaimState> {
  void previousState;

  if (!isSupabaseConfigured) {
    return {
      status: "error",
      message: "Add your Supabase environment variables before reserving artwork.",
      downloadUrl: null,
    };
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      status: "error",
      message: "Supabase is unavailable right now. Try again in a moment.",
      downloadUrl: null,
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      status: "error",
      message: "Sign in with X before claiming your piece.",
      downloadUrl: null,
    };
  }

  const submissionId = formData.get("submissionId")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";

  if (!submissionId) {
    return {
      status: "error",
      message: "We couldn't determine which piece to reserve.",
      downloadUrl: null,
    };
  }

  if (!isValidEmail(email)) {
    return {
      status: "error",
      message: "Add a valid email address so we can reach you when full minting goes live.",
      downloadUrl: null,
    };
  }

  const { data: submission, error: submissionError } = await supabase
    .from("submissions")
    .select("id, user_id, clean_image_path")
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionError || !submission) {
    return {
      status: "error",
      message: "We couldn't find that Garden piece anymore.",
      downloadUrl: null,
    };
  }

  if (submission.user_id !== user.id) {
    return {
      status: "error",
      message: "Only the original submitter can reserve this piece.",
      downloadUrl: null,
    };
  }

  const { data: existingClaim } = await supabase
    .from("submission_claims")
    .select("status, user_id")
    .eq("submission_id", submissionId)
    .maybeSingle();

  if (existingClaim?.user_id && existingClaim.user_id !== user.id) {
    return {
      status: "error",
      message: "This claim is already assigned and cannot be transferred.",
      downloadUrl: null,
    };
  }

  const { error: claimError } = await supabase.from("submission_claims").upsert(
    {
      submission_id: submissionId,
      user_id: user.id,
      email,
      fee_cents: DEFAULT_MINT_FEE_CENTS,
      status: existingClaim?.status === "minted" ? "minted" : "reserved",
    },
    { onConflict: "submission_id" },
  );

  if (claimError) {
    return {
      status: "error",
      message: "We couldn't save your reservation right now. Please try again.",
      downloadUrl: null,
    };
  }

  let downloadUrl: string | null = null;
  let message =
    "Reserved. We'll email you when wallet minting goes live, and your clean download is unlocked for the next 24 hours.";

  if (typeof submission.clean_image_path === "string" && submission.clean_image_path) {
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(CLEAN_DOWNLOAD_BUCKET)
      .createSignedUrl(submission.clean_image_path, 60 * 60 * 24);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      message =
        "Reserved. We'll email you when wallet minting goes live, but we couldn't generate the clean download link just yet.";
    } else {
      downloadUrl = signedUrlData.signedUrl;
    }
  }

  revalidatePath("/");

  return {
    status: "success",
    message,
    downloadUrl,
  };
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect("/?message=signed_out");
}
