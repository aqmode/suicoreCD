-- Админка показывает все заказы, включая со статусом new (Ждёт отправки).
-- Иначе при смене статуса на «Ждёт отправки» заказ пропадал из списка.

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
      where o.status in ('new', 'paid', 'shipped', 'at_pvz')
    )
  ) into result;
  return result;
end;
$$;
