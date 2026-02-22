-- Проверка схемы (только SQL — можно вставлять в psql или запускать через -f).
-- Запуск: psql -U shop_admin -d shop_db -h localhost -f check_schema.sql

-- 1. Таблицы (должно быть 5 строк)
SELECT relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND relname IN ('profiles', 'cart_items', 'orders', 'order_items', '_admin')
ORDER BY relname;

-- 2. Функции (должно быть 3 строки)
SELECT p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('get_admin_data', 'delete_order_admin', 'update_order_status_admin')
ORDER BY p.proname;

-- 3. Пароль админки (должно быть 1)
SELECT count(*) AS admin_secrets FROM public._admin;

-- 4. Индекс корзины (должна быть 1 строка)
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'cart_items'
  AND indexname = 'cart_items_user_release_track_key';

-- 5. Сводка: всё ли на месте (всего 4 строки = ок)
SELECT
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind = 'r'
     AND relname IN ('profiles','cart_items','orders','order_items','_admin')) AS tables_ok_5,
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname IN ('get_admin_data','delete_order_admin','update_order_status_admin')) AS functions_ok_3,
  (SELECT count(*) FROM public._admin) AS admin_secret_ok_1,
  (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'cart_items' AND indexname = 'cart_items_user_release_track_key') AS index_ok_1;
