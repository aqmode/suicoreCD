# Supabase setup

1. Create a project at [supabase.com](https://supabase.com).

2. In **Settings → API**: copy **Project URL** and **anon public** key into `.env`:
   - `VITE_SUPABASE_URL=https://your-ref.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=<anon key>`

3. In **Authentication → Providers → Google**: enable Google and set:
   - Client ID: `1001831698350-oia3i7rnf1kgm7ccebo88rddmffe0e0m.apps.googleusercontent.com`
   - Client Secret: `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`

4. In **Authentication → URL Configuration**:
   - Site URL: `http://localhost:5173`
   - Redirect URLs: add `http://localhost:5173/google/redirect`

5. In **SQL Editor**, run the contents of `schema.sql` to create `profiles`, `cart_items`, and storage bucket `avatars`.
