-- Схема для входа по логину в БД shop_db (сервер shop_admin).
-- Подключение: postgresql://shop_admin:***@5.42.101.54:5432/shop_db
-- В проекте задаётся через DATABASE_URL в .env (не коммитить .env).
--
-- Эндпоинт POST /api/auth/by-login уже реализован в server/db-api (проверка через bcrypt).

-- Таблица пользователей (логин → email для Supabase)
create table if not exists login_users (
  id         serial primary key,
  login      text not null unique,
  password_hash text not null,
  email      text not null,
  created_at timestamptz default now()
);

create index if not exists idx_login_users_login on login_users (login);

comment on table login_users is 'Пользователи входа по логину (ЮКасса и др.). email должен совпадать с пользователем в Supabase.';
comment on column login_users.password_hash is 'Хеш пароля (bcrypt или argon2). Пароль в Supabase для этого email должен совпадать с тем, что вводит пользователь.';

-- ========== Как сделать bcrypt-хеш пароля ==========
--
-- Способ 1 — скрипт в проекте (удобнее всего):
--   В корне проекта:  node scripts/hash-password.js "ваш_пароль"
--   В консоль выведется строка вида $2a$10$... — её вставляйте в password_hash.
--
-- Способ 2 — в Node.js вручную:
--   node -e "const bcrypt=require('bcryptjs'); console.log(bcrypt.hashSync('ваш_пароль', 10));"
--   (замените 'ваш_пароль' на нужный пароль, кавычки внутри экранируйте или используйте скрипт выше.)
--
-- Способ 3 — в коде (для разового запуска):
--   const bcrypt = require('bcryptjs');
--   const hash = bcrypt.hashSync('weallloveyookassa', 10);  // 10 — число раундов (можно 10–12)
--   console.log(hash);  // копируете в INSERT ниже
--
-- Важно: пароль в Supabase (Auth → Users) и пароль, от которого вы считаете хеш, должны совпадать.
-- Один и тот же пароль пользователь вводит при входе; сервер проверяет его по хешу в login_users.
--
-- ========== Пример добавления пользователя ==========
-- 1) Создайте пользователя в Supabase (Auth → Users): email + пароль.
-- 2) Сгенерируйте хеш этого пароля (способы выше).
-- 3) Выполните INSERT.

-- Готовый INSERT для тестового пользователя ЮКасса (логин yookassa, email yookassa@suicore.space, пароль weallloveyookassa):
insert into login_users (login, password_hash, email) values
  ('yookassa', '$2a$10$DOekBMSe135VdjpzleVVoeJH5r4du3A6Fvuqfgpvf6Aoxo8FdjTwK', 'yookassa@suicore.space')
on conflict (login) do update set password_hash = excluded.password_hash, email = excluded.email;
