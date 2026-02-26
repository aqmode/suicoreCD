-- Грант для двухаргументной get_admin_data (admin_password, include_deleted).
-- Выполните после 09_orders_soft_delete.sql. Если ошибка «function get_admin_data(unknown, unknown) does not exist» —
-- сначала примените 09_orders_soft_delete.sql.
grant execute on function public.get_admin_data(text, boolean) to shop_admin;
