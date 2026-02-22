# Настройка Supabase для CDsuicore

Чтобы исчезли ошибки **404** (profiles, cart_items) и **400** (загрузка аватарки), в проекте Supabase нужно один раз выполнить схему.

## Шаги

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard) и выберите проект с URL `ulsrmocvmnzkmnarmqod.supabase.co`.

2. В левом меню откройте **SQL Editor** → **New query**.

3. Скопируйте **весь** текст из файла **`supabase/schema.sql`** и вставьте в редактор.

4. Нажмите **Run** (или Ctrl+Enter).

5. Убедитесь, что в **Authentication → URL Configuration** в **Redirect URLs** есть:
   - `http://localhost:5173/google/redirect`
   - при необходимости добавьте ваш продакшен-URL.

После выполнения:
- появятся таблицы **profiles** и **cart_items** (исчезнут 404);
- создастся bucket **avatars** и политики Storage (загрузка фото перестанет давать 400);
- для уже залогиненных пользователей создадутся строки в **profiles**.

Остальные сообщения в консоли:
- **Unchecked runtime.lastError: The message port closed...** — обычно от расширений браузера, не от приложения.
- **gtmpx.com ... ERR_BLOCKED_BY_CLIENT** — блокировка рекламы/аналитики, на работу сайта не влияет.
