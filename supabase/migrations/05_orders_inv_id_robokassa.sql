-- Числовой InvId для Робокассы (уникальный в рамках магазина)
create sequence if not exists public.order_inv_id_seq;

alter table public.orders add column if not exists inv_id integer;

update public.orders set inv_id = nextval('public.order_inv_id_seq') where inv_id is null;

alter table public.orders alter column inv_id set default nextval('public.order_inv_id_seq');

-- Для уже существующих строк с inv_id = null после добавления колонки:
do $$
begin
  if exists (select 1 from public.orders where inv_id is null) then
    update public.orders set inv_id = nextval('public.order_inv_id_seq') where inv_id is null;
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'inv_id') then
    update public.orders set inv_id = nextval('public.order_inv_id_seq') where inv_id is null;
  end if;
end $$;

alter table public.orders alter column inv_id set not null;

create unique index if not exists orders_inv_id_key on public.orders (inv_id);

comment on column public.orders.inv_id is 'Числовой номер счёта для Робокассы (InvId)';
