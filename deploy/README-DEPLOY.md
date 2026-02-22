# Деплой на VPS (suicore.space)

Сервер: **5.42.101.54**, пользователь **root**. Пароль вводится при подключении по SSH (нигде не храните его в репозитории).

## 1. Подключение к серверу

```bash
ssh root@5.42.101.54
```

Введите пароль когда запросит.

## 2. Подготовка кода на сервере

**Вариант A: клонирование из Git (если репозиторий в GitHub/GitLab)**

```bash
apt-get update && apt-get install -y git
git clone https://github.com/YOUR_USER/CDsuicore.git /var/www/suicore
cd /var/www/suicore
```

**Вариант B: загрузка с локальной машины (rsync)**

На своей машине (из папки проекта):

```bash
# Установите rsync если нет (Windows: через WSL или установщик)
rsync -avz --exclude node_modules --exclude .git . root@5.42.101.54:/var/www/suicore/
```

После первого rsync для обновления просто повторите эту команду.

## 3. Переменные окружения на сервере

Создайте на сервере файл `/var/www/suicore/.env` (скопируйте с локального `.env` или по образцу `deploy/env.example`). Обязательно:

- `DATABASE_URL` — подключение к Postgres (у вас БД на 5.42.101.54)
- `SUPABASE_JWT_SECRET`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `API_PORT=3001`
- `VITE_APP_ORIGIN=https://suicore.space`
- `ROBOKASSA_*`, `PAYMENT_BASE_URL=https://suicore.space`
- Остальные `VITE_*` как в вашем текущем `.env` (цены, ключ Яндекс.Карт и т.д.)

На сервере:

```bash
nano /var/www/suicore/.env
# вставьте переменные, сохраните (Ctrl+O, Enter, Ctrl+X)
```

## 4. Запуск скрипта установки на сервере

Если код уже в `/var/www/suicore` и `.env` создан:

**С локальной машины (одной командой):**

```bash
ssh root@5.42.101.54 "cd /var/www/suicore && bash deploy/setup-server.sh"
```

Или зайдите по SSH и выполните:

```bash
cd /var/www/suicore
bash deploy/setup-server.sh
```

Скрипт установит Node.js 20, nginx, PM2, зависимости, соберёт фронтенд и запустит API.

## 5. SSL (HTTPS)

Когда домен **suicore.space** уже указывает на 5.42.101.54 (A-запись на этот IP), на сервере выполните:

```bash
certbot --nginx -d suicore.space -d www.suicore.space
```

Следуйте подсказкам (email, согласие). Certbot сам настроит HTTPS в nginx.

## 6. Обновление сайта после изменений

На своей машине соберите и залейте обновления:

```bash
# Залить код (если используете rsync)
rsync -avz --exclude node_modules --exclude .git . root@5.42.101.54:/var/www/suicore/

# Дальше на сервере:
ssh root@5.42.101.54 "cd /var/www/suicore && npm ci && npm run build && pm2 restart suicore-api"
```

Или зайти по SSH и в `/var/www/suicore` выполнить: `npm ci && npm run build && pm2 restart suicore-api`.

## Полезные команды на VPS

- Логи API: `pm2 logs suicore-api`
- Статус: `pm2 status`
- Перезапуск API: `pm2 restart suicore-api`
- Проверка nginx: `nginx -t && systemctl status nginx`
- Перезагрузка nginx: `systemctl reload nginx`

## Важно

- Пароль root нигде не храните в коде и не коммитьте. Для автоматизации лучше настроить SSH-ключ: `ssh-copy-id root@5.42.101.54`.
- Файл `.env` добавлен в `.gitignore` — не удаляйте его из игнора и не коммитьте секреты.
