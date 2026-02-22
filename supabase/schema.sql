-- Run this ONCE in Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Fixes 404 on profiles/cart_items and 400 on avatar upload.

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Trigger: create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill profiles for users that already exist (run once)
insert into public.profiles (id, full_name)
select id, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name')
from auth.users
on conflict (id) do update set full_name = coalesce(profiles.full_name, excluded.full_name);

-- Cart items (track_id/track_name = один трек альбома; null = сингл целиком)
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  release_id text not null,
  release_name text not null,
  cover_url text not null,
  price_rub int not null,
  quantity int not null default 1,
  track_id text,
  track_name text,
  created_at timestamptz default now()
);
create unique index if not exists cart_items_user_release_track_key
  on public.cart_items (user_id, release_id, coalesce(track_id, ''));

alter table public.cart_items enable row level security;

create policy "Users can manage own cart"
  on public.cart_items for all
  using (auth.uid() = user_id);

-- Storage bucket for avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar upload"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Avatar read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Avatar update/delete own"
  on storage.objects for all
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
