alter table credits
  add column if not exists weekly_collection_day integer,
  add column if not exists renewed_from_credit_id uuid references credits(id) on delete set null;

alter table credits
  drop constraint if exists credits_weekly_collection_day_check;

alter table credits
  add constraint credits_weekly_collection_day_check
  check (weekly_collection_day is null or weekly_collection_day between 0 and 6);

create index if not exists credits_renewed_from_credit_id_idx
  on credits(renewed_from_credit_id);
