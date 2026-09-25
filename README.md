# Mirror Gallery

A full-stack art gallery web application built with Next.js 16, Tailwind CSS, Supabase, and Twitter/X OAuth.

## Features

- Twitter/X OAuth 2.0 login through Supabase Auth
- Session-aware submission form for authenticated artists
- Image uploads to a public Supabase storage bucket
- Responsive masonry gallery sorted newest first
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
   - Enable the **Twitter** provider under **Authentication → Providers**
   - Add your local callback URL: `http://localhost:3000/auth/callback`
   - Create the schema and storage bucket with the SQL in `supabase/migrations/202609251314_create_gallery.sql`

4. Start the app:

   ```bash
   npm run dev
   ```

## Production deployment

1. Deploy the repository to Vercel (or any Next.js-compatible host).
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the hosting dashboard.
3. In Supabase Auth, add your production callback URL:

   ```text
   https://your-domain.com/auth/callback
   ```

4. If you are using a custom domain such as `mirror.neunexart`, point the domain at your hosting provider and add the same callback URL in both:
   - Supabase Auth provider settings
   - Your Twitter/X developer app configuration

## Database and storage

The migration creates:

- `public.users`
- `public.submissions`
- public `art-submissions` storage bucket
- row-level security policies for reading and authenticated inserts

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
