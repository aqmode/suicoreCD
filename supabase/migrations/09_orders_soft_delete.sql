-- Мягкое удаление заказов: сохраняем в БД, в админке можно показать удалённые и отменить удаление.

alter table public.orders add column if not exists deleted_at timestamptz default null;
comment on column public.orders.deleted_at is 'Когда заказ помечен удалённым (мягкое удаление). null = не удалён.';

create or replace function public.get_admin_data(admin_password text, include_deleted boolean default false)
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
          'deleted_at', o.deleted_at,
          'items', (select coalesce(json_agg(row_to_json(i)), '[]'::json) from public.order_items i where i.order_id = o.id)
        )
        order by o.created_at desc
      ), '[]'::json)
      from public.orders o
      where o.status in ('new', 'paid', 'shipped', 'at_pvz')
        and (include_deleted or o.deleted_at is null)
    )
  ) into result;
  return result;
end;
$$;

drop function if exists public.delete_order_admin(text, uuid);
create function public.delete_order_admin(admin_password text, order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public._admin where secret = admin_password) then
    return false;
  end if;
  update public.orders set deleted_at = now() where id = delete_order_admin.order_id and deleted_at is null;
  return found;
end;
$$;

create or replace function public.restore_order_admin(admin_password text, order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public._admin where secret = admin_password) then
    return false;
  end if;
  update public.orders set deleted_at = null where id = restore_order_admin.order_id and deleted_at is not null;
  return found;
end;
$$;

-- Для standalone Postgres (shop_db): grant execute on function public.restore_order_admin(text, uuid) to shop_admin;
