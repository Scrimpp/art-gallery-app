create table if not exists public.submission_assets (
  submission_id uuid primary key references public.submissions (id) on delete cascade,
  clean_image_path text not null
);

insert into public.submission_assets (submission_id, clean_image_path)
select id, clean_image_path
from public.submissions
where clean_image_path is not null
on conflict (submission_id) do update
set clean_image_path = excluded.clean_image_path;

alter table public.submission_assets enable row level security;

drop policy if exists "Artists can view own submission assets" on public.submission_assets;
create policy "Artists can view own submission assets"
on public.submission_assets
for select
to authenticated
using (
  exists (
    select 1
    from public.submissions
    where public.submissions.id = public.submission_assets.submission_id
      and public.submissions.user_id = auth.uid()
  )
);

drop policy if exists "Artists can insert own submission assets" on public.submission_assets;
create policy "Artists can insert own submission assets"
on public.submission_assets
for insert
to authenticated
with check (
  exists (
    select 1
    from public.submissions
    where public.submissions.id = public.submission_assets.submission_id
      and public.submissions.user_id = auth.uid()
  )
);

drop policy if exists "Artists can update own submission assets" on public.submission_assets;
create policy "Artists can update own submission assets"
on public.submission_assets
for update
to authenticated
using (
  exists (
    select 1
    from public.submissions
    where public.submissions.id = public.submission_assets.submission_id
      and public.submissions.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.submissions
    where public.submissions.id = public.submission_assets.submission_id
      and public.submissions.user_id = auth.uid()
  )
);

drop policy if exists "Artists can delete own submission assets" on public.submission_assets;
create policy "Artists can delete own submission assets"
on public.submission_assets
for delete
to authenticated
using (
  exists (
    select 1
    from public.submissions
    where public.submissions.id = public.submission_assets.submission_id
      and public.submissions.user_id = auth.uid()
  )
);

alter table public.submissions
drop column if exists clean_image_path;

drop policy if exists "Artists can view own claims" on public.submission_claims;
create policy "Artists can view own claims"
on public.submission_claims
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.reserve_submission_claim(
  target_submission_id uuid,
  claim_email text,
  claim_fee_cents integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  submission_owner_id uuid;
  existing_claim_user_id uuid;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select user_id
  into submission_owner_id
  from public.submissions
  where id = target_submission_id;

  if submission_owner_id is null then
    raise exception 'SUBMISSION_NOT_FOUND';
  end if;

  if submission_owner_id <> current_user_id then
    raise exception 'SUBMISSION_NOT_OWNED';
  end if;

  select user_id
  into existing_claim_user_id
  from public.submission_claims
  where submission_id = target_submission_id;

  if existing_claim_user_id is not null and existing_claim_user_id <> current_user_id then
    raise exception 'CLAIM_ALREADY_ASSIGNED';
  end if;

  insert into public.submission_claims (
    submission_id,
    user_id,
    email,
    fee_cents,
    status,
    updated_at
  )
  values (
    target_submission_id,
    current_user_id,
    claim_email,
    claim_fee_cents,
    'reserved',
    timezone('utc', now())
  )
  on conflict (submission_id) do update
  set email = excluded.email,
      fee_cents = excluded.fee_cents,
      status = case
        when public.submission_claims.status = 'minted' then 'minted'
        else excluded.status
      end,
      updated_at = timezone('utc', now());
end;
$$;

grant execute on function public.reserve_submission_claim(uuid, text, integer) to authenticated;
