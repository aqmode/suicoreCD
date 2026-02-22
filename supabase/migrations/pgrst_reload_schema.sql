-- Выполни в Supabase → SQL Editor ПОСЛЕ admin_delete_orders.sql (отдельным запросом).
-- Обновляет кэш PostgREST, иначе RPC может отдавать 400.
notify pgrst, 'reload schema';
