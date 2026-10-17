# Apex Genesis Web

This is the React/Vite online companion for Apex Genesis. It uses Supabase Auth and Postgres; it does not use the old Express/SQLite prototype.

## Local setup

1. Install Node.js 20+.
2. Copy `.env.example` to `.env`.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from your Supabase project settings.
4. In the Supabase dashboard, open SQL Editor and run the complete file `../supabase/migrations/20261017000000_initial_schema.sql`.
5. Run:

```powershell
npm install
npm run dev
```

Production checks:

```powershell
npm run lint
npm run build
```

## Included online features

- Email/password registration and sign-in with persistent Supabase sessions.
- Community feed, create/delete own posts, follow/unfollow, profiles and rank.
- Create/join public teams.
- Tournament listing and self-registration.
- Published announcements.
- Rank-based training lessons with per-user progress synchronization.
- Virtual shop, inventory, and Genesis Coin ledger. Purchase operations run through the atomic `purchase_shop_item` database function; the client cannot directly write coin transactions.

## Deployment (Vercel)

Set the project root to `frontend`, framework to Vite, build command to `npm run build`, and output directory to `dist`. Configure these environment variables in Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Set the Supabase Auth Site URL and allowed redirect URLs to the final HTTPS deployment URL. Keep `.env`, Supabase secret/service-role keys, database passwords and tokens out of Git.

## Administrator bootstrap

After your own account is registered, run this in Supabase SQL Editor, replacing the email with the exact account you own:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where lower(email) = lower('YOUR-EMAIL-HERE')
on conflict (user_id, role) do nothing;
```

Only use this for your own verified owner account. The browser cannot grant itself admin. Admins can publish announcements, manage shop items and manage tournaments through authenticated operations protected by RLS. The wallet adjustment function is also admin-only.

## Important

The SQL migration must be executed in the Supabase project before these pages can use the database. A successful frontend build only validates the client bundle; it does not prove database migration, email delivery, or production hosting has been completed.

[executed on device: WIN-JS1MMJ6G3LN (47b38491-93fe-4329-b37c-d57703e8bb81)]