# Wishlist cross-device sync patch

## Changes
- Added a foreground polling fallback (every 8 seconds) to refresh Supabase-backed data on other devices even if Supabase Realtime is not enabled or fails to subscribe.
- Refresh data on browser focus and when the page becomes visible.
- Run a fresh snapshot immediately after Realtime reports `SUBSCRIBED`.
- Log Realtime channel errors/status so configuration failures are visible in the browser console.

## Verified from repository
- Wishlist table is `public.wishlist_items`.
- Realtime subscription filters on `user_id` and the table is queried from Supabase on refresh.
- `supabase_schema.sql` contains own-user RLS policies and an attempt to add `wishlist_items` to `supabase_realtime`.

## Manual checks still required
If writes succeed but another device never sees updates, verify the deployed Supabase project has the `wishlist_items` table in `supabase_realtime`, and both devices are signed into the same Supabase project and same user. Confirm RLS select policy permits `auth.uid() = user_id`. This patch does not disable RLS or use a service-role key.

Polling fallback applies while the app tab is visible/online; background/suspended browser tabs may pause timers and sync on focus/visibility return.
