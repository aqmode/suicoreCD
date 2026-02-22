-- Создать таблицу profiles, если её нет (проверка показала 4 таблицы вместо 5).
-- Запуск: psql -U shop_admin -d shop_db -h localhost -f 04_create_profiles.sql

create table if not exists public.profiles (
  id uuid primary key,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.profiles is 'Профили пользователей. id совпадает с id из системы авторизации.';

grant select, insert, update, delete on public.profiles to shop_admin;
