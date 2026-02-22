-- Ультимативная схема для standalone PostgreSQL (без Supabase).
-- Подключение: postgresql://shop_admin:Unfortun@tely1@5.42.101.54:5432/shop_db
--
-- ВЫПОЛНЯТЬ ТОЛЬКО ЧЕРЕЗ ФАЙЛ (не вставлять вручную в psql — строки могут смешаться):
--   psql -U shop_admin -d shop_db -h localhost -f standalone_full_schema.sql
--
-- Если у shop_admin нет прав на public: сначала от postgres выполнить
--   ALTER SCHEMA public OWNER TO shop_admin;
-- или 00_run_as_postgres.sql, затем этот файл от shop_admin.

-- =============================================================================
-- 1. ПРОФИЛИ (id = uuid пользователя из вашей системы авторизации, например Supabase Auth)
-- =============================================================================
create table if not exists public.profiles (
  id uuid primary key,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.profiles is 'Профили пользователей. id совпадает с id из системы авторизации.';

-- =============================================================================
-- 2. КОРЗИНА
-- =============================================================================
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  release_id text not null,
  release_name text not null,
  cover_url text not null,
  price_rub int not null,
  quantity int not null default 1,
  track_id text,
  track_name text,
  created_at timestamptz default now()
);

create unique index if not exists cart_items_user_release_track_key
  on public.cart_items (user_id, release_id, coalesce(track_id, ''));

comment on table public.cart_items is 'Корзина: user_id = id из авторизации.';

-- =============================================================================
-- 3. ЗАКАЗЫ
-- =============================================================================
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

comment on column public.orders.status is 'new | shipped | at_pvz';

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  release_id text not null,
  release_name text not null,
  cover_url text,
  price_rub int not null,
  quantity int not null default 1
);

-- =============================================================================
-- 4. АДМИНКА (пароль для входа в /admin)
-- =============================================================================
create table if not exists public._admin (
  secret text not null
);

insert into public._admin (secret)
select 'Unfortun@tely1' where not exists (select 1 from public._admin limit 1);

-- =============================================================================
-- 5. ФУНКЦИИ АДМИНКИ
-- =============================================================================

-- Список пользователей и заказов по паролю
create or replace function public.get_admin_data(admin_password text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not exists (select 1 from public._admin where secret = admin_password) then
    return null;
  end if;
  select json_build_object(
    'users', (select coalesce(json_agg(row_to_json(p)), '[]'::json) from public.profiles p),
    'orders', (
      select coalesce(json_agg(
        json_build_object(
          'id', o.id,
          'user_id', o.user_id,
          'customer_name', o.customer_name,
          'customer_phone', o.customer_phone,
          'customer_email', o.customer_email,
          'delivery_address', o.delivery_address,
          'pvz_code', o.pvz_code,
          'pvz_name', o.pvz_name,
          'total_rub', o.total_rub,
          'status', o.status,
          'created_at', o.created_at,
          'items', (select coalesce(json_agg(row_to_json(i)), '[]'::json) from public.order_items i where i.order_id = o.id)
        )
        order by o.created_at desc
      ), '[]'::json)
      from public.orders o
    )
  ) into result;
  return result;
end;
$$;

-- Удаление заказа по паролю
create or replace function public.delete_order_admin(admin_password text, order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public._admin where secret = admin_password) then
    return false;
  end if;
  delete from public.order_items where order_items.order_id = delete_order_admin.order_id;
  delete from public.orders where orders.id = delete_order_admin.order_id;
  return found;
end;
$$;

-- Смена статуса заказа (new / shipped / at_pvz)
create or replace function public.update_order_status_admin(admin_password text, order_id uuid, new_status text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public._admin where secret = admin_password) then
    return false;
  end if;
  if new_status is null or new_status not in ('new', 'shipped', 'at_pvz') then
    return false;
  end if;
  update public.orders set status = new_status where id = update_order_status_admin.order_id;
  return found;
end;
$$;

-- =============================================================================
-- 6. ПРАВА (подставь своего пользователя БД, если не shop_admin)
-- =============================================================================
grant usage on schema public to shop_admin;
grant select, insert, update, delete on public.profiles to shop_admin;
grant select, insert, update, delete on public.cart_items to shop_admin;
grant select, insert, update, delete on public.orders to shop_admin;
grant select, insert, update, delete on public.order_items to shop_admin;
grant select, insert, update, delete on public._admin to shop_admin;
grant usage, select on all sequences in schema public to shop_admin;
grant execute on function public.get_admin_data(text) to shop_admin;
grant execute on function public.delete_order_admin(text, uuid) to shop_admin;
grant execute on function public.update_order_status_admin(text, uuid, text) to shop_admin;

-- default privileges для будущих таблиц (опционально)
alter default privileges in schema public grant select, insert, update, delete on tables to shop_admin;
alter default privileges in schema public grant usage, select on sequences to shop_admin;
