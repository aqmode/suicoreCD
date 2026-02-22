-- Выполнить ОДИН РАЗ от пользователя postgres (суперпользователь).
-- Даёт shop_admin право создавать объекты в схеме public.
-- После этого можно выполнить standalone_full_schema.sql от пользователя shop_admin.
--
-- На сервере (где уже есть доступ к postgres):
--   sudo -u postgres psql -d shop_db -f 00_run_as_postgres.sql
-- Или:  psql "postgresql://postgres:ПАРОЛЬ_ПОСТГРЕСА@localhost:5432/shop_db" -f 00_run_as_postgres.sql

grant create on schema public to shop_admin;
