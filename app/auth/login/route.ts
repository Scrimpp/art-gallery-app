import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildRequestOrigin } from "@/lib/url";
import { isSupabaseConfigured } from "@/lib/env";

export async function GET(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.redirect(
      new URL("/?error=auth_config_missing", request.url),
    );
  }

  const supabase = createServerSupabaseClient();

  if (!supabase) {
    return NextResponse.redirect(
      new URL("/?error=auth_config_missing", request.url),
    );
  }

  const redirectTo = `${buildRequestOrigin(request)}/auth/callback`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "twitter",
    options: {
      redirectTo,
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(
      new URL("/?error=oauth_start_failed", request.url),
    );
  }

  return NextResponse.redirect(data.url);
}
