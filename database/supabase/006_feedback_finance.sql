create sequence if not exists credit_number_seq;

alter table credits
  add column if not exists credit_number integer;

with ordered_credits as (
  select
    id,
    row_number() over (order by created_at asc, id asc) as next_number
  from credits
  where credit_number is null
)
update credits
set credit_number = ordered_credits.next_number
from ordered_credits
where credits.id = ordered_credits.id;

select setval(
  'credit_number_seq',
  greatest(coalesce((select max(credit_number) from credits), 0), 1),
  true
);

alter table credits
  alter column credit_number set default nextval('credit_number_seq');

create unique index if not exists credits_credit_number_key
  on credits(credit_number);

create index if not exists credits_credit_number_idx
  on credits(credit_number);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null,
  concept text not null,
  amount numeric(12,2) not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_positive_amount check (amount > 0)
);

create index if not exists expenses_expense_date_idx
  on expenses(expense_date);

create table if not exists daily_finance_entries (
  id uuid primary key default gen_random_uuid(),
  finance_date date not null unique,
  initial_capital numeric(12,2) not null default 0,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_finance_entries_non_negative_capital check (initial_capital >= 0)
);

drop trigger if exists expenses_set_updated_at on expenses;
create trigger expenses_set_updated_at
before update on expenses
for each row execute function set_updated_at();

drop trigger if exists daily_finance_entries_set_updated_at on daily_finance_entries;
create trigger daily_finance_entries_set_updated_at
before update on daily_finance_entries
for each row execute function set_updated_at();
