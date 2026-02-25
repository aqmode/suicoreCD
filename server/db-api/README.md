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

### Запуск API на сервере (чтобы не было 502 на проде)

1. **На сервере** задайте переменные окружения для процесса API (`.env`, pm2 env, systemd):
   - `DATABASE_URL`, `SUPABASE_JWT_SECRET`, при необходимости `VITE_SUPABASE_URL` / `SUPABASE_URL`, `ROBOKASSA_*`, `API_PORT=3001`
   - **Spotify (иначе «Spotify init failed»):** `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`; при необходимости прокси: `SPOTIFY_PROXY=http://user:pass@host:port` или `PROXY=host:port:user:pass`

2. **Запустите процесс API** (должен работать постоянно):
   ```bash
   # Вариант с pm2 (npm i -g pm2)
   API_PORT=3001 pm2 start "npx tsx server/db-api/index.ts" --name suicore-api
   pm2 save && pm2 startup
   ```
   Или через systemd: юнит с `ExecStart=npx tsx /path/to/server/db-api/index.ts` и `Environment=DATABASE_URL=... API_PORT=3001`.

3. **Настройте прокси** так, чтобы запросы с `/api` (кроме `/api/spotify`, если он отдаётся фронтом) уходили на этот процесс. Пример для **nginx** (на том же сервере):
   ```nginx
   location /api/ {
     proxy_pass http://127.0.0.1:3001/api/;
     proxy_http_version 1.1;
     proxy_set_header Host $host;
     proxy_set_header X-Real-IP $remote_addr;
     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
     proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```
   После правок: `sudo nginx -t && sudo systemctl reload nginx`.

4. **Проверка:** откройте в браузере `https://ваш-домен/api/health`. Должно вернуть `{"ok":true}`. Если 502 — процесс не запущен или nginx не проксирует на порт 3001.

## Ошибка 502 при /api/auth/by-login

502 Bad Gateway значит, что до API запрос доходит, но сам процесс API не отвечает. Проверьте:

1. **Локальная разработка** — в отдельном терминале должен быть запущен API:
   ```bash
   npm run dev:api
   ```
   После этого откройте в браузере http://localhost:3001/api/health — должно вернуть `{"ok":true}`. Если 502 — процесс не запущен или падает при старте (проверьте логи в терминале и `DATABASE_URL` в `.env`).

2. **Прод** — см. раздел «Запуск API на сервере» выше. Откройте `https://ваш-домен/api/health`: если 502, поднять процесс API и настроить прокси на порт, где он слушает (например 3001).
