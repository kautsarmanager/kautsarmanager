# Bug audit and fixes

## Changes applied in this revision

1. **Wishlist deadline clearing** — clearing the date field now sends `null` rather than `undefined`. JSON serialization drops `undefined` fields, so a previous deadline could remain in Supabase after a user cleared it. `WishlistItem.deadline` now allows `null`.
2. **Vite ESM path resolution** — replaced `__dirname` with `fileURLToPath(import.meta.url)` and `path.dirname`, which is compatible with the project's ESM configuration.
3. **Node TypeScript types** — added `node` alongside `vite/client` in `tsconfig.json`, matching the existing `@types/node` dev dependency and allowing the Vite config's Node globals to be typed.

## Important findings that still require environment/deployment verification

- `dataService` intentionally stores mutations locally first and queues Supabase writes. Failed queue items are retained and logged to the browser console, but the current UI does not reliably show that a cloud write is pending or failed.
- Supabase URL/key are build-time `VITE_` variables. Cloudflare Pages must have `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` configured for the production build. The local `.env.local` is deliberately excluded from this archive because it can contain credentials.
- The provided environment could not complete dependency installation, so a full TypeScript check and production build could not be confirmed. Run `npm ci`, `npm run lint`, and `npm run build` in the project environment before deploying.
- This source audit does not access or modify the live Supabase database and does not claim that every possible bug has been eliminated.

## Safe validation checklist

1. Configure the two Supabase environment variables in Cloudflare Pages build settings.
2. Deploy a preview build.
3. Edit a Wishlist name, target amount, and deadline; confirm the `wishlist_items` row changes in Supabase.
4. Clear the deadline and save; confirm the database `deadline` becomes `NULL`.
5. Reload the site and sign in to the same account on another device; verify the values match.
6. Test task, finance, file, and Wishlist create/update/delete flows before promoting the build.
