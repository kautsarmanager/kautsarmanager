# Wishlist Supabase fix report

## Changes
- Wishlist create/update/deposit/sub-target toggle/delete now await the Supabase write path and show an error toast if the write cannot be confirmed.
- Writes target the existing `public.wishlist_items` table and explicitly map columns from `supabase_schema.sql`; `user_id` is taken from the active authenticated session.
- RLS-related zero-row update/delete responses are treated as failures, not successes.
- Failed/offline writes are retained in the existing per-user sync outbox and the local cache is retained.
- Cloud refresh preserves locally queued Wishlist records and avoids resurrecting records with a queued soft-delete.

## Schema and security review
The repository schema defines `public.wishlist_items` with UUID `id` primary key, `user_id` referencing `auth.users(id)`, `name`, `description`, `category`, numeric `target_price`, `saved_amount`, `base_target_price`, JSONB `subtasks`, nullable `deadline`, `completed`, nullable `deleted_at`, and timestamps. The code uses this existing table. The checked-in SQL enables RLS and defines per-user policies tied to `auth.uid()`; no RLS disabling, service-role key, or table creation was added. The live Supabase database and its deployed policies cannot be verified from this source archive alone.

## Validation
- `npm run lint` (`tsc --noEmit`): passed.
- `npm run build`: not completed. The supplied `node_modules` lacks the platform-specific Rolldown native binding (`@rolldown/binding-linux-x64-gnu`), and package installation could not complete in this environment. This is an environment/dependency issue, not a confirmed successful build.
- Live create/edit/delete/status-toggle/refresh round-trip tests were not possible without a working installed build/runtime and access to the configured Supabase project. Do not treat cloud CRUD as live-verified.

## Manual follow-up
1. In the project environment, run `npm ci` (ensure network access and optional native dependencies are available), then `npm run lint` and `npm run build`.
2. Sign in using a normal authenticated user and test create, edit, deposit/status toggle, delete, and reload. Verify rows in `public.wishlist_items` with the same `user_id`.
3. If writes are denied, inspect the deployed table columns and RLS policies in Supabase Dashboard. Do not disable RLS. Configure `.env.local` from `.env.example`; this delivery intentionally excludes `.env.local` and all credentials.
