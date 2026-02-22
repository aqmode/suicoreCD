#!/bin/bash
# Запускать на VPS под root после клонирования репозитория в /var/www/suicore
# Использование: ssh root@5.42.101.54 'bash -s' < deploy/setup-server.sh
# Или: scp deploy/setup-server.sh root@5.42.101.54:/tmp/ && ssh root@5.42.101.54 bash /tmp/setup-server.sh

set -e
APP_DIR="${APP_DIR:-/var/www/suicore}"

echo "=== Установка Node.js 20 LTS ==="
if ! command -v node &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
node -v
npm -v

echo "=== Установка nginx и certbot ==="
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx

echo "=== Установка PM2 ==="
npm install -g pm2

echo "=== Зависимости проекта в $APP_DIR ==="
cd "$APP_DIR"
npm ci

echo "=== Сборка фронтенда ==="
npm run build

echo "=== Копирование nginx конфига ==="
cp -f deploy/nginx-suicore.conf /etc/nginx/sites-available/suicore.space
ln -sf /etc/nginx/sites-available/suicore.space /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "=== Файл .env ==="
if [ ! -f "$APP_DIR/.env" ]; then
    echo "Создайте .env в $APP_DIR (скопируйте с локальной машины или из env.example)."
    echo "Минимум: DATABASE_URL, SUPABASE_JWT_SECRET, API_PORT=3001, ROBOKASSA_*, PAYMENT_BASE_URL, VITE_* для сборки."
    exit 1
fi

echo "=== Запуск API через PM2 ==="
cd "$APP_DIR"
pm2 delete suicore-api 2>/dev/null || true
pm2 start npm --name suicore-api -- run api
pm2 save
pm2 startup | tail -1

echo "=== SSL (если домен уже указывает на этот сервер) ==="
echo "Выполните: certbot --nginx -d suicore.space -d www.suicore.space"
echo "Готово. Проверьте: https://suicore.space"
