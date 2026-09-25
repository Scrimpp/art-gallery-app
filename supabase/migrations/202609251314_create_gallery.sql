create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  twitter_id text not null unique,
  username text not null unique,
  display_name text not null,
  profile_picture_url text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null check (char_length(description) between 1 and 500),
  mood text not null check (mood in ('ethereal', 'raw', 'dark', 'vibrant', 'peaceful')),
  image_url text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists submissions_created_at_idx on public.submissions (created_at desc);

alter table public.users enable row level security;
alter table public.submissions enable row level security;

drop policy if exists "Public can view artists" on public.users;
create policy "Public can view artists"
on public.users
for select
using (true);

drop policy if exists "Artists can insert own profile" on public.users;
create policy "Artists can insert own profile"
on public.users
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Artists can update own profile" on public.users;
create policy "Artists can update own profile"
on public.users
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Public can view submissions" on public.submissions;
create policy "Public can view submissions"
on public.submissions
for select
using (true);

drop policy if exists "Artists can create submissions" on public.submissions;
create policy "Artists can create submissions"
on public.submissions
for insert
to authenticated
with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'art-submissions',
  'art-submissions',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view gallery images" on storage.objects;
create policy "Public can view gallery images"
on storage.objects
for select
using (bucket_id = 'art-submissions');

drop policy if exists "Artists can upload own gallery images" on storage.objects;
create policy "Artists can upload own gallery images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'art-submissions'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Artists can update own gallery images" on storage.objects;
create policy "Artists can update own gallery images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'art-submissions'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'art-submissions'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Artists can delete own gallery images" on storage.objects;
create policy "Artists can delete own gallery images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'art-submissions'
  and (storage.foldername(name))[1] = auth.uid()::text
);
