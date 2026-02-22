-- Добавляем статус paid (выставляется при успешном Result URL Робокассы).
-- Статусы: new = ожидает оплаты, paid = оплачено, shipped = отправлено, at_pvz = ждёт в ПВЗ.

comment on column public.orders.status is 'new | paid | shipped | at_pvz';

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
  if new_status is null or new_status not in ('new', 'paid', 'shipped', 'at_pvz') then
    return false;
  end if;
  update public.orders set status = new_status where id = update_order_status_admin.order_id;
  return found;
end;
$$;
