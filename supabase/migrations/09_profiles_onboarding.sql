-- Добавить флаги прохождения онбординга (отдельно для ПК и мобильных)

alter table public.profiles
  add column if not exists onboarding_desktop_done boolean not null default false,
  add column if not exists onboarding_mobile_done boolean not null default false;

comment on column public.profiles.onboarding_desktop_done is 'Пользователь прошёл обучение на десктопе';
comment on column public.profiles.onboarding_mobile_done is 'Пользователь прошёл обучение на мобильном';
