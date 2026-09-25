# Garden

A full-stack art gallery web application built with Next.js 16, Tailwind CSS, Supabase, and Twitter/X OAuth.

## Features

- Twitter/X OAuth 2.0 login through Supabase Auth
- Session-aware submission form for authenticated artists
- Watermarked public previews plus protected clean downloads with 24-hour signed URLs
- Claim flow for mint reservations with email capture
- Simple treasury dashboard for tracking reservations, mints, and revenue
- Responsive masonry gallery sorted newest first
- Fixed scroll-to-top and scroll-to-bottom controls
- PWA manifest, installable icons, and offline service worker registration
- Dark theme with subtle gold accents

## Tech stack

- Next.js 16 app router
- Tailwind CSS
- Supabase (Auth, Postgres, Storage)
- Twitter/X OAuth 2.0

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and add your Supabase project values:

   ```bash
   cp .env.local.example .env.local
   ```

3. In Supabase:
   - Enable the **Twitter** provider under **Authentication → Providers** (Supabase still labels the X login provider as `twitter`)
   - Add your local callback URL: `http://localhost:3000/auth/callback`
   - Run the SQL migrations in `supabase/migrations`

4. Start the app:

   ```bash
   npm run dev
   ```

## Production deployment

1. Deploy the repository to Vercel (or any Next.js-compatible host).
2. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `ALLOWED_AUTH_REDIRECT_HOSTS`, and optionally `GARDEN_ADMIN_USERNAME` in the hosting dashboard.
3. In Supabase Auth, add your production callback URL:

   ```text
   https://your-domain.com/auth/callback
   ```

4. If you are using a custom domain such as `garden.neunexart`, point the domain at your hosting provider and add the same callback URL in both:
   - Supabase Auth provider settings
   - Your Twitter/X developer app configuration
5. Import the GitHub repository into Vercel, set the environment variables above, and redeploy so the PWA manifest, trusted OAuth callback origin, and service worker ship with your production build.

## Database and storage

The migrations create:

- `public.users`
- `public.submissions`
- `public.submission_claims`
- `public.treasury_totals`
- public `art-submissions` preview bucket
- protected `art-originals` clean-download bucket
- row-level security policies for submissions, claims, and storage access

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
