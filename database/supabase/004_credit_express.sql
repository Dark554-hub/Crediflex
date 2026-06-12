do $$
begin
  if not exists (select 1 from pg_type where typname = 'credit_product_type') then
    create type credit_product_type as enum ('standard', 'express');
  end if;
end $$;

alter table credits
add column if not exists product_type credit_product_type not null default 'standard';

create index if not exists idx_credits_product_type on credits(product_type);
