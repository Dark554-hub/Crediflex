alter table clients
  add column if not exists identification text,
  add column if not exists client_number text,
  add column if not exists home_phone text,
  add column if not exists email text,
  add column if not exists personal_reference_name text,
  add column if not exists personal_reference_phone text,
  add column if not exists personal_reference_address text;

create unique index if not exists clients_client_number_key
  on clients(client_number)
  where client_number is not null;

alter table credits
  add column if not exists print_receipt_default boolean not null default false;

alter table payments
  add column if not exists receipt_generated boolean not null default true;
