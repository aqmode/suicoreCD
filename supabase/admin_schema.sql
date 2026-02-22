-- Заказы и админка. Выполнить в Supabase → SQL Editor после основного schema.sql.

-- Заказы
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
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

-- Позиции заказа
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  release_id text not null,
  release_name text not null,
  cover_url text,
  price_rub int not null,
  quantity int not null default 1
);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Users can read own orders" on public.orders;
create policy "Users can read own orders"
  on public.orders for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own orders" on public.orders;
create policy "Users can insert own orders"
  on public.orders for insert with check (auth.uid() = user_id);

drop policy if exists "Users can read own order_items" on public.order_items;
create policy "Users can read own order_items"
  on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

drop policy if exists "Users can insert order_items for own order" on public.order_items;
create policy "Users can insert order_items for own order"
  on public.order_items for insert
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- Секрет админа (пароль для входа в /admin). Один раз вставить пароль.
create table if not exists public._admin (
  secret text not null
);

-- Пароль админки (вставится только если таблица пустая):
insert into public._admin (secret)
select 'Unfortun@tely1' where not exists (select 1 from public._admin limit 1);

-- Функция: по паролю возвращает список пользователей и заказов (только если пароль верный)
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

-- Политики: разрешить DELETE только когда в сессии установлен флаг (ставится в RPC после проверки пароля)
drop policy if exists "Admin can delete orders" on public.orders;
create policy "Admin can delete orders"
  on public.orders for delete
  using (current_setting('app.admin_ok', true) = '1');

drop policy if exists "Admin can delete order_items" on public.order_items;
create policy "Admin can delete order_items"
  on public.order_items for delete
  using (current_setting('app.admin_ok', true) = '1');

-- Удаление заказа: проверка пароля, удаление (владелец postgres обходит RLS)
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
  delete from public.order_items where order_id = delete_order_admin.order_id;
  delete from public.orders where id = delete_order_admin.order_id;
  return found;
end;
$$;

alter function public.delete_order_admin(text, uuid) owner to postgres;

-- Смена статуса заказа (только new / shipped / at_pvz)
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

alter function public.update_order_status_admin(text, uuid, text) owner to postgres;

-- Разрешить вызов RPC для anon (проверка пароля внутри функции)
grant execute on function public.get_admin_data(text) to anon;
grant execute on function public.get_admin_data(text) to authenticated;
grant execute on function public.delete_order_admin(text, uuid) to anon;
grant execute on function public.delete_order_admin(text, uuid) to authenticated;
grant execute on function public.update_order_status_admin(text, uuid, text) to anon;
grant execute on function public.update_order_status_admin(text, uuid, text) to authenticated;
