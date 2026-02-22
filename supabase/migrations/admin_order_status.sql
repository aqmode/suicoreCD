-- Статусы заказов в админке. Выполнить в Supabase → SQL Editor.
-- Статусы: new = ждет отправки, shipped = отправлено, at_pvz = приехало (ждет в ПВЗ).

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

grant execute on function public.update_order_status_admin(text, uuid, text) to anon;
grant execute on function public.update_order_status_admin(text, uuid, text) to authenticated;
