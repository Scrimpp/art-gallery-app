import { NextResponse } from "next/server";
import { syncUserProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.redirect(
      new URL("/?error=auth_config_missing", request.url),
    );
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/?error=oauth_callback_failed", request.url));
  }

  const supabase = createServerSupabaseClient();

  if (!supabase) {
    return NextResponse.redirect(
      new URL("/?error=oauth_callback_failed", request.url),
    );
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/?error=oauth_callback_failed", request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await syncUserProfile(supabase, user);
  }

  return NextResponse.redirect(new URL("/?message=signed_in", request.url));
}
