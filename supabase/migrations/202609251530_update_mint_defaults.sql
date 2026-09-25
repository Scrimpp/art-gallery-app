alter table public.submissions
alter column mint_fee_cents set default 2000;

alter table public.submission_claims
alter column fee_cents set default 2000;
