export const env = {
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "").trim().replace(/\/$/, ""),
  allowedAuthRedirectHosts: process.env.ALLOWED_AUTH_REDIRECT_HOSTS ?? "",
  gardenAdminUsername: process.env.GARDEN_ADMIN_USERNAME?.trim().toLowerCase() ?? "",
};

export const isSupabaseConfigured = Boolean(
  env.supabaseUrl && env.supabaseAnonKey,
);
