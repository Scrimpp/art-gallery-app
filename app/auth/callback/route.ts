import { NextResponse } from "next/server";
import { syncUserProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildTrustedOrigin } from "@/lib/url";

export async function GET(request: Request) {
  const appOrigin = buildTrustedOrigin(request);

  if (!isSupabaseConfigured) {
    return NextResponse.redirect(
      new URL("/?error=auth_config_missing", appOrigin),
    );
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/?error=oauth_callback_failed", appOrigin));
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return NextResponse.redirect(
      new URL("/?error=oauth_callback_failed", appOrigin),
    );
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/?error=oauth_callback_failed", appOrigin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const syncError = await syncUserProfile(supabase, user);

    if (syncError) {
      await supabase.auth.signOut();

      return NextResponse.redirect(
        new URL("/?error=profile_sync_failed", appOrigin),
      );
    }
  }

  return NextResponse.redirect(new URL("/?message=signed_in", appOrigin));
}
