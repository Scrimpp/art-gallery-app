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
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.submissions
    where public.submissions.id = public.submission_claims.submission_id
      and public.submissions.user_id = auth.uid()
  )
);

drop policy if exists "Artists can upsert own claims" on public.submission_claims;
create policy "Artists can upsert own claims"
on public.submission_claims
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.submissions
    where public.submissions.id = public.submission_claims.submission_id
      and public.submissions.user_id = auth.uid()
  )
);

drop policy if exists "Artists can update own claims" on public.submission_claims;
create policy "Artists can update own claims"
on public.submission_claims
for update
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.submissions
    where public.submissions.id = public.submission_claims.submission_id
      and public.submissions.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.submissions
    where public.submissions.id = public.submission_claims.submission_id
      and public.submissions.user_id = auth.uid()
  )
);

drop view if exists public.treasury_totals;

create table if not exists public.treasury_totals (
  id boolean primary key default true,
  total_mints integer not null default 0,
  total_reservations integer not null default 0,
  revenue_cents integer not null default 0,
  pipeline_cents integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  check (id)
);

alter table public.treasury_totals enable row level security;

drop policy if exists "Authenticated users can view treasury totals" on public.treasury_totals;
create policy "Authenticated users can view treasury totals"
on public.treasury_totals
for select
to authenticated
using (true);

create or replace function public.sync_treasury_totals()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.treasury_totals (
    id,
    total_mints,
    total_reservations,
    revenue_cents,
    pipeline_cents,
    updated_at
  )
  select
    true,
    count(*) filter (where status = 'minted'),
    count(*) filter (where status = 'reserved'),
    coalesce(sum(fee_cents) filter (where status = 'minted'), 0),
    coalesce(sum(fee_cents) filter (where status = 'reserved'), 0),
    timezone('utc', now())
  from public.submission_claims
  on conflict (id) do update
  set total_mints = excluded.total_mints,
      total_reservations = excluded.total_reservations,
      revenue_cents = excluded.revenue_cents,
      pipeline_cents = excluded.pipeline_cents,
      updated_at = excluded.updated_at;
end;
$$;

create or replace function public.refresh_treasury_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_treasury_totals();
  return null;
end;
$$;

drop trigger if exists submission_claims_refresh_treasury_totals on public.submission_claims;
create trigger submission_claims_refresh_treasury_totals
after insert or update or delete on public.submission_claims
for each statement
execute function public.refresh_treasury_totals();

select public.sync_treasury_totals();

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
