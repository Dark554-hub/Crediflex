-- Crediflex - Supabase PostgreSQL schema
-- Step 1: complete database schema approved before application modules.

create extension if not exists "pgcrypto";

create type client_status as enum ('active', 'settled', 'delinquent', 'inactive');
create type credit_type as enum ('daily', 'weekly');
create type credit_product_type as enum ('standard', 'express');
create type credit_status as enum ('active', 'settled', 'delinquent', 'cancelled');
create type installment_status as enum ('pending', 'partial', 'paid', 'overdue');
create type payment_method as enum ('cash', 'transfer', 'other');
create type collection_item_status as enum ('pending', 'paid', 'partial', 'missed', 'overdue');
create type agreement_status as enum ('active', 'completed', 'broken', 'cancelled');

create table zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  phone text,
  main_zone_id uuid references zones(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  identification text,
  client_number text unique,
  phone text,
  home_phone text,
  email text,
  address text not null,
  personal_reference_name text,
  personal_reference_phone text,
  personal_reference_address text,
  zone_id uuid not null references zones(id) on delete restrict,
  status client_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table credit_settings (
  id uuid primary key default gen_random_uuid(),
  default_daily_interest_rate numeric(8,4) not null default 0,
  default_weekly_interest_rate numeric(8,4) not null default 0,
  default_late_fee_amount numeric(12,2) not null default 0,
  default_late_fee_rate numeric(8,4) not null default 0,
  late_fee_grace_days integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint credit_settings_rates_non_negative check (
    default_daily_interest_rate >= 0
    and default_weekly_interest_rate >= 0
    and default_late_fee_amount >= 0
    and default_late_fee_rate >= 0
    and late_fee_grace_days >= 0
  )
);

create table credits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete restrict,
  zone_id uuid not null references zones(id) on delete restrict,
  product_type credit_product_type not null default 'standard',
  type credit_type not null,
  principal_amount numeric(12,2) not null,
  interest_rate numeric(8,4) not null,
  interest_amount numeric(12,2) not null,
  total_amount numeric(12,2) not null,
  installment_count integer not null,
  installment_amount numeric(12,2) not null,
  late_fee_amount numeric(12,2) not null default 0,
  late_fee_rate numeric(8,4) not null default 0,
  late_fee_grace_days integer not null default 0,
  print_receipt_default boolean not null default false,
  weekly_collection_day integer,
  renewed_from_credit_id uuid references credits(id) on delete set null,
  start_date date not null,
  expected_end_date date not null,
  status credit_status not null default 'active',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  settled_at timestamptz,
  cancelled_at timestamptz,
  constraint credits_positive_amounts check (
    principal_amount > 0
    and interest_rate >= 0
    and interest_amount >= 0
    and total_amount > 0
    and installment_count > 0
    and installment_amount > 0
    and late_fee_amount >= 0
    and late_fee_rate >= 0
    and late_fee_grace_days >= 0
    and (weekly_collection_day is null or weekly_collection_day between 0 and 6)
  ),
  constraint credits_total_matches_components check (total_amount = principal_amount + interest_amount),
  constraint credits_end_after_start check (expected_end_date >= start_date),
  constraint credits_settlement_state check (
    (status = 'settled' and settled_at is not null)
    or (status <> 'settled')
  ),
  constraint credits_cancel_state check (
    (status = 'cancelled' and cancelled_at is not null)
    or (status <> 'cancelled')
  )
);

create table credit_installments (
  id uuid primary key default gen_random_uuid(),
  credit_id uuid not null references credits(id) on delete cascade,
  installment_number integer not null,
  due_date date not null,
  scheduled_amount numeric(12,2) not null,
  principal_component numeric(12,2) not null,
  interest_component numeric(12,2) not null,
  paid_amount numeric(12,2) not null default 0,
  late_fee_amount numeric(12,2) not null default 0,
  status installment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (credit_id, installment_number),
  constraint installments_positive_amounts check (
    installment_number > 0
    and scheduled_amount > 0
    and principal_component >= 0
    and interest_component >= 0
    and paid_amount >= 0
    and late_fee_amount >= 0
  ),
  constraint installments_scheduled_matches_components check (
    scheduled_amount = principal_component + interest_component
  )
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete restrict,
  credit_id uuid not null references credits(id) on delete restrict,
  payment_date date not null,
  amount numeric(12,2) not null,
  method payment_method not null default 'cash',
  notes text,
  receipt_generated boolean not null default true,
  received_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  constraint payments_positive_amount check (amount > 0)
);

create table payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  installment_id uuid not null references credit_installments(id) on delete restrict,
  amount_applied numeric(12,2) not null,
  late_fee_applied numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  constraint payment_allocations_positive_amounts check (
    amount_applied > 0
    and late_fee_applied >= 0
  )
);

create table collection_days (
  id uuid primary key default gen_random_uuid(),
  collection_date date not null unique,
  operator_id uuid references profiles(id) on delete set null,
  total_expected numeric(12,2) not null default 0,
  total_collected numeric(12,2) not null default 0,
  total_pending numeric(12,2) not null default 0,
  total_overdue numeric(12,2) not null default 0,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collection_days_non_negative_totals check (
    total_expected >= 0
    and total_collected >= 0
    and total_pending >= 0
    and total_overdue >= 0
  )
);

create table collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_day_id uuid not null references collection_days(id) on delete cascade,
  client_id uuid not null references clients(id) on delete restrict,
  credit_id uuid not null references credits(id) on delete restrict,
  installment_id uuid not null references credit_installments(id) on delete restrict,
  zone_id uuid not null references zones(id) on delete restrict,
  expected_amount numeric(12,2) not null,
  collected_amount numeric(12,2) not null default 0,
  status collection_item_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection_day_id, installment_id),
  constraint collection_items_non_negative_amounts check (
    expected_amount >= 0
    and collected_amount >= 0
  )
);

create table delinquency_agreements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete restrict,
  credit_id uuid not null references credits(id) on delete restrict,
  agreement_date date not null,
  promised_payment_date date not null,
  promised_amount numeric(12,2) not null,
  notes text,
  status agreement_status not null default 'active',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delinquency_agreements_positive_amount check (promised_amount > 0),
  constraint delinquency_agreements_promise_after_agreement check (promised_payment_date >= agreement_date)
);

create table export_jobs (
  id uuid primary key default gen_random_uuid(),
  export_type text not null,
  date_from date,
  date_to date,
  zone_id uuid references zones(id) on delete set null,
  file_path text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint export_jobs_valid_date_range check (
    date_from is null
    or date_to is null
    or date_to >= date_from
  )
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  performed_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index clients_zone_id_idx on clients(zone_id);
create index clients_status_idx on clients(status);
create index clients_full_name_idx on clients using gin (to_tsvector('spanish', full_name));

create index credits_client_id_idx on credits(client_id);
create index credits_zone_id_idx on credits(zone_id);
create index credits_status_idx on credits(status);
create index credits_type_idx on credits(type);
create index credits_product_type_idx on credits(product_type);
create index credits_start_date_idx on credits(start_date);
create index credits_renewed_from_credit_id_idx on credits(renewed_from_credit_id);

create index credit_installments_credit_id_idx on credit_installments(credit_id);
create index credit_installments_due_date_idx on credit_installments(due_date);
create index credit_installments_status_idx on credit_installments(status);

create index payments_client_id_idx on payments(client_id);
create index payments_credit_id_idx on payments(credit_id);
create index payments_payment_date_idx on payments(payment_date);

create index payment_allocations_payment_id_idx on payment_allocations(payment_id);
create index payment_allocations_installment_id_idx on payment_allocations(installment_id);

create index collection_items_collection_day_id_idx on collection_items(collection_day_id);
create index collection_items_zone_id_idx on collection_items(zone_id);
create index collection_items_status_idx on collection_items(status);

create index delinquency_agreements_credit_id_idx on delinquency_agreements(credit_id);
create index delinquency_agreements_status_idx on delinquency_agreements(status);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger zones_set_updated_at
before update on zones
for each row execute function set_updated_at();

create trigger profiles_set_updated_at
before update on profiles
for each row execute function set_updated_at();

create trigger clients_set_updated_at
before update on clients
for each row execute function set_updated_at();

create trigger credit_settings_set_updated_at
before update on credit_settings
for each row execute function set_updated_at();

create trigger credits_set_updated_at
before update on credits
for each row execute function set_updated_at();

create trigger credit_installments_set_updated_at
before update on credit_installments
for each row execute function set_updated_at();

create trigger payments_set_updated_at
before update on payments
for each row execute function set_updated_at();

create trigger collection_days_set_updated_at
before update on collection_days
for each row execute function set_updated_at();

create trigger collection_items_set_updated_at
before update on collection_items
for each row execute function set_updated_at();

create trigger delinquency_agreements_set_updated_at
before update on delinquency_agreements
for each row execute function set_updated_at();

insert into zones (name, description)
values
  ('Motul', 'Ruta de cobranza en Motul, Yucatan'),
  ('Izamal', 'Ruta de cobranza en Izamal, Yucatan')
on conflict (name) do nothing;

insert into credit_settings (
  default_daily_interest_rate,
  default_weekly_interest_rate,
  default_late_fee_amount,
  default_late_fee_rate,
  late_fee_grace_days
)
values (0, 0, 0, 0, 0);
