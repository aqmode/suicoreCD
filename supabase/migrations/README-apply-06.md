# Как применить миграцию 06_order_status_paid.sql

В этом проекте **в Supabase хранится только авторизация и аватарки** (Storage). Профили, корзина, заказы и админка живут в **серверной Postgres** (переменная `DATABASE_URL` в `.env`). Поэтому миграции 05 и 06 нужно применять к **серверной БД**, а не в Supabase Dashboard.

## Команда (с твоей машины)

Подставь в URL пароль и хост из `.env` (из `DATABASE_URL`):

```bash
psql "postgresql://shop_admin:ПАРОЛЬ@5.42.101.54:5432/shop_db" -f supabase/migrations/06_order_status_paid.sql
```

Если к Postgres подключаешься через SSH-туннель (например порт 5432 проброшен на localhost:5432), используй:

```bash
psql "postgresql://shop_admin:ПАРОЛЬ@localhost:5432/shop_db" -f supabase/migrations/06_order_status_paid.sql
```

## Проверка

В той же БД выполни:

```sql
-- Комментарий к колонке status (там должен быть 'paid'):
SELECT col_description('public.orders'::regclass, (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.orders'::regclass AND attname = 'status' AND NOT attisdropped));

-- Что функция допускает статус 'paid':
SELECT proname, prosrc FROM pg_proc WHERE proname = 'update_order_status_admin';
```

В `prosrc` должно быть `'new', 'paid', 'shipped', 'at_pvz'`.
