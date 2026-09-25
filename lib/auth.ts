import type { SupabaseClient, User } from "@supabase/supabase-js";

type UnknownRecord = Record<string, unknown>;

function readString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

export function getIdentitySnapshot(user: User) {
  const metadata = (user.user_metadata ?? {}) as UnknownRecord;
  const identityData = ((user.identities ?? []).find(
    (identity) => identity.provider === "twitter",
  )?.identity_data ?? {}) as UnknownRecord;

  const username =
    readString(
      metadata.user_name,
      metadata.preferred_username,
      identityData.user_name,
      identityData.preferred_username,
      metadata.username,
    ) ?? "artist";

  const displayName =
    readString(
      metadata.full_name,
      metadata.name,
      metadata.display_name,
      identityData.name,
      username,
    ) ?? "Artist";

  return {
    twitterId: readString(
      identityData.sub,
      identityData.user_id,
      metadata.provider_id,
      metadata.sub,
    ),
    username,
    displayName,
    profilePictureUrl: readString(
      metadata.avatar_url,
      metadata.picture,
      identityData.avatar_url,
      identityData.picture,
    ),
  };
}

export async function syncUserProfile(
  supabase: SupabaseClient,
  user: User,
) {
  const profile = getIdentitySnapshot(user);

  if (!profile.twitterId) {
    return;
  }

  await supabase.from("users").upsert(
    {
      id: user.id,
      twitter_id: profile.twitterId,
      username: profile.username,
      display_name: profile.displayName,
      profile_picture_url: profile.profilePictureUrl,
    },
    { onConflict: "id" },
  );
}
