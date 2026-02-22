-- Если при первом запуске из-за вставки в psql не создались orders/order_items — выполнить:
--   psql -U shop_admin -d shop_db -h localhost -f 03_ensure_orders_tables.sql

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  delivery_address text,
  pvz_code text,
  pvz_name text,
  total_rub int not null default 0,
  status text not null default 'new',
  created_at timestamptz default now()
);

comment on column public.orders.status is 'new | paid | shipped | at_pvz';

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  release_id text not null,
  release_name text not null,
  cover_url text,
  price_rub int not null,
  quantity int not null default 1
);

grant select, insert, update, delete on public.orders to shop_admin;
grant select, insert, update, delete on public.order_items to shop_admin;
grant usage, select on all sequences in schema public to shop_admin;
