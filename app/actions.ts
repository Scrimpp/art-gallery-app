"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { syncUserProfile } from "@/lib/auth";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_DESCRIPTION_LENGTH,
  MAX_FILE_SIZE,
  MAX_TITLE_LENGTH,
  MOODS,
  STORAGE_BUCKET,
} from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  type SubmissionState,
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

  const objectPath = `${user.id}/${Date.now()}-${sanitizeBaseName(image.name) || "artwork"}.${getFileExtension(image.type)}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(objectPath, image, {
      contentType: image.type,
      upsert: false,
    });

  if (uploadError) {
    return {
      status: "error",
      message: "We couldn't upload your artwork. Check your storage bucket settings and try again.",
    };
  }

  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(objectPath);

  const { error: insertError } = await supabase.from("submissions").insert({
    user_id: user.id,
    title,
    description,
    mood,
    image_url: publicUrlData.publicUrl,
  });

  if (insertError) {
    await supabase.storage.from(STORAGE_BUCKET).remove([objectPath]);

    return {
      status: "error",
      message: "Your artwork was uploaded, but the gallery entry could not be saved.",
    };
  }

  revalidatePath("/");

  return {
    status: "success",
    message: "Artwork submitted — it should appear at the top of the gallery now.",
  };
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect("/?message=signed_out");
}
