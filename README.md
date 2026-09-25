# Garden

A full-stack art gallery web application built with Next.js 16, Tailwind CSS, Supabase, and Twitter/X OAuth.

## Features

- Twitter/X OAuth 2.0 login through Supabase Auth
- Session-aware submission form for authenticated artists
- Watermarked public previews plus protected clean downloads with 24-hour signed URLs
- Claim flow for mint reservations with email capture
- Transparent treasury dashboard for tracking reservations, mints, revenue, and configured proceeds splits
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

1. Import the GitHub repository into Vercel and deploy the current Garden project.
2. In **Vercel → Project → Settings → Domains**, remove any stale connections for `neunex.art` and `mirror-neunex.art`.
3. Re-add both domains to this project so they resolve to the current deployment at `mirror-lkt24ppt2-scrimpps-projects.vercel.app`.
4. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `ALLOWED_AUTH_REDIRECT_HOSTS`, and optionally `GARDEN_ADMIN_USERNAME` in the Vercel environment settings with values like:

   ```text
   NEXT_PUBLIC_SITE_URL=https://neunex.art
   ALLOWED_AUTH_REDIRECT_HOSTS=neunex.art,mirror-neunex.art,mirror-lkt24ppt2-scrimpps-projects.vercel.app
   ```

5. In Supabase Auth, add your production callback URLs:

   ```text
   https://neunex.art/auth/callback
   https://mirror-neunex.art/auth/callback
   https://mirror-lkt24ppt2-scrimpps-projects.vercel.app/auth/callback
   ```

6. Add the same callback URLs in your Twitter/X developer app configuration.
7. Redeploy after the domain updates so the PWA manifest, trusted OAuth callback origin, and service worker all ship with the latest production configuration.

## Mint proceeds configuration

Garden keeps the mint breakdown transparent for artists and admins:

- 40% → Original artist / creator
- 25% → Garden ecosystem treasury
- 20% → Liquidity pool
- 10% → Curation rewards
- 5% → Platform maintenance

The default Garden mint target range is `$20–$50`, and the current default mint fee starts at `$20.00`. Update `lib/treasury.ts` if you need to change the default mint pricing or the split percentages.

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
