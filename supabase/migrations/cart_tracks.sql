-- Корзина по трекам: для альбомов — отдельная позиция на трек, для синглов — без track_id.
-- Выполнить в Supabase → SQL Editor если cart_items уже создан из schema.sql.

alter table public.cart_items
  add column if not exists track_id text,
  add column if not exists track_name text;

alter table public.cart_items drop constraint if exists cart_items_user_id_release_id_key;

create unique index cart_items_user_release_track_key
  on public.cart_items (user_id, release_id, coalesce(track_id, ''));
