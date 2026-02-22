# API для standalone PostgreSQL

Данные приложения (профили, корзина, заказы, админка) идут через этот API в БД `postgresql://shop_admin:...@5.42.101.54:5432/shop_db`. Авторизация и аватары остаются в Supabase.

## Запуск

1. В `.env` задать:
   - `DATABASE_URL=postgresql://shop_admin:Unfortun@tely1@5.42.101.54:5432/shop_db`
   - `SUPABASE_JWT_SECRET` — взять в Supabase Dashboard → Settings → API → JWT Secret

2. Запустить API (в одном терминале):
   ```bash
   npm run dev:api
   ```

3. Запустить фронт (в другом терминале):
   ```bash
   npm run dev
   ```

Vite проксирует запросы с `/api` (кроме `/api/spotify`) на `http://localhost:3001`.

## Продакшен

- Поднять этот сервер на том же хосте или отдельно.
- Либо проксировать `/api` на этот сервер, либо задать `VITE_API_URL` при сборке (полный URL API).
