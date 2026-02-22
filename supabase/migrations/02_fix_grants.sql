-- Если схема уже создана, но GRANTы падали — выполнить от shop_admin:
--   psql -U shop_admin -d shop_db -h localhost -f 02_fix_grants.sql

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
