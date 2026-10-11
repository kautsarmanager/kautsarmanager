# Implementation status after audit

## Implemented in this revision

- Replaced local username/PIN account creation with Supabase Auth email/password registration and login.
- Added session restoration and logout through Supabase Auth.
- Removed the hard-coded referral secret from client code and settings. Public signup is currently enabled at the application layer.
- Updated Supabase schema with UUID identifiers, profile creation trigger, RLS policies, UPDATE policies, timestamps, indexes, `deleted_at` columns, private Storage bucket and per-user Storage policies.
- Enabled cloud reads and writes for tasks, transactions, file metadata, wishlist, and profile.
- Added localStorage outbox with retry when connectivity returns.
- Added Supabase Realtime listeners to refresh data after cloud changes.
- Switched generated IDs to UUIDs.
- Changed private file access to signed URLs; file upload is capped at 20 MB and errors are shown to the user.
- Kept legacy data untouched rather than assigning it automatically to the first cloud account; JSON export includes legacy data keys.
- Disabled service worker registration in development.
- Removed dependencies that were not referenced by application source and removed the stale Bun lockfile because the project instructions use npm.

## Not fully implemented yet

- Local cache and outbox still use `localStorage`, not IndexedDB/Dexie. Storage quota and browser-clearing risks remain.
- There is no complete conflict-resolution strategy for simultaneous offline edits on multiple devices.
- File uploads require an internet connection; offline file blobs are not persisted for later upload.
- Activity history is still local only.
- AI Assistant is still local-rule-based; a secure server-side AI Edge Function has not been added.
- Legacy account data is backed up but not automatically imported into Supabase. Import must be explicit and must validate ownership and UUIDs.
- Full `npm install`, type-check and production build could not be verified here because dependency installation timed out in this environment. TypeScript/TSX syntax transpilation completed with zero syntax diagnostics, but this is not equivalent to a full type-check/build.

## Required setup before testing

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Run `supabase_schema.sql` in the Supabase SQL Editor; review first if the project already contains production data.
4. Configure Supabase email/password authentication and decide whether email confirmation is required.
5. Run `npm install`, `npm run lint`, and `npm run build` locally.
6. Register a test account, create a task, and verify it appears on a second device signed in to the same account.
7. Test account isolation with two separate accounts before using real personal data.

Never put a Supabase `service_role` key in `.env.local` variables beginning with `VITE_` or in any frontend code.
