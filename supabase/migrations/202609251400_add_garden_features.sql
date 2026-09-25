alter table public.submissions
add column if not exists clean_image_path text,
add column if not exists mint_fee_cents integer not null default 1200 check (mint_fee_cents >= 0);

create table if not exists public.submission_claims (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  email text not null,
  fee_cents integer not null default 1200 check (fee_cents >= 0),
  status text not null default 'reserved' check (status in ('reserved', 'minted')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists submission_claims_user_id_idx on public.submission_claims (user_id);
create index if not exists submission_claims_status_idx on public.submission_claims (status);

alter table public.submission_claims enable row level security;

drop policy if exists "Artists can view own claims" on public.submission_claims;
create policy "Artists can view own claims"
on public.submission_claims
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Artists can upsert own claims" on public.submission_claims;
create policy "Artists can upsert own claims"
on public.submission_claims
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Artists can update own claims" on public.submission_claims;
create policy "Artists can update own claims"
on public.submission_claims
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace view public.treasury_totals as
select
  count(*) filter (where status = 'minted') as total_mints,
  count(*) filter (where status = 'reserved') as total_reservations,
  coalesce(sum(fee_cents) filter (where status = 'minted'), 0) as revenue_cents,
  coalesce(sum(fee_cents), 0) as pipeline_cents
from public.submission_claims;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'art-originals',
  'art-originals',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Art gallery artists can view own originals" on storage.objects;
create policy "Art gallery artists can view own originals"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'art-originals'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Art gallery artists can upload own originals" on storage.objects;
create policy "Art gallery artists can upload own originals"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'art-originals'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Art gallery artists can delete own originals" on storage.objects;
create policy "Art gallery artists can delete own originals"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'art-originals'
  and (storage.foldername(name))[1] = auth.uid()::text
);
