-- Позиции заказа: для трека из альбома сохраняем название трека (track_name).
-- release_name — альбом; при наличии track_name показываем «CD {track_name}», иначе «CD {release_name}».
--
-- Выполнить в shop_db (иначе при оплате: column "track_id" of relation "order_items" does not exist):
--   psql "postgresql://shop_admin:PASSWORD@5.42.101.54:5432/shop_db" -f supabase/migrations/10_order_items_track.sql

alter table public.order_items
  add column if not exists track_id text,
  add column if not exists track_name text;

comment on column public.order_items.track_name is 'Название трека, если заказан один трек из альбома; иначе null (весь релиз).';
