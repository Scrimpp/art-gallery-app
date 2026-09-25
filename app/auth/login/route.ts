import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildTrustedOrigin } from "@/lib/url";
import { isSupabaseConfigured } from "@/lib/env";

export async function GET(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.redirect(
      new URL("/?error=auth_config_missing", request.url),
    );
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return NextResponse.redirect(
      new URL("/?error=auth_config_missing", request.url),
    );
  }

  const redirectTo = `${buildTrustedOrigin()}/auth/callback`;
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
