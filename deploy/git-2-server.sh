#!/bin/bash
# Деплой на сервере: подтянуть код, собрать, перезапустить.
# На сервере: cp deploy/git-2-server.sh /git-2.sh && chmod +x /git-2.sh

set -e
cd /var/www/suicore.space

# Сбрасываем локальные изменения в package-lock.json, чтобы git pull не падал
git checkout -- package-lock.json 2>/dev/null || true
git stash 2>/dev/null || true

git fetch origin
git checkout maybe
git pull origin maybe

npm install
npm run build
pm2 restart all

echo "Done."
