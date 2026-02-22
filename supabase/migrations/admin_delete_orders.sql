-- Удаление заказов из админки. Выполнить в Supabase → SQL Editor если удаление не работает.
-- После выполнения отдельно запусти: notify pgrst, 'reload schema';

-- 1) Политики RLS (на случай если функция не от postgres)
drop policy if exists "Admin can delete orders" on public.orders;
create policy "Admin can delete orders"
  on public.orders for delete
  using (current_setting('app.admin_ok', true) = '1');

drop policy if exists "Admin can delete order_items" on public.order_items;
create policy "Admin can delete order_items"
  on public.order_items for delete
  using (current_setting('app.admin_ok', true) = '1');

-- 2) Удалить старую функцию и создать заново (чтобы PostgREST подхватил сигнатуру)
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
  delete from public.order_items where order_items.order_id = delete_order_admin.order_id;
  delete from public.orders where orders.id = delete_order_admin.order_id;
  return found;
end;
$$;

-- Владелец postgres обходит RLS (если ошибка — удали эту строку и выполни скрипт снова)
alter function public.delete_order_admin(text, uuid) owner to postgres;

grant execute on function public.delete_order_admin(text, uuid) to anon;
grant execute on function public.delete_order_admin(text, uuid) to authenticated;
