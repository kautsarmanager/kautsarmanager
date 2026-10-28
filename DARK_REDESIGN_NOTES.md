# Dark redesign + responsive fixes

Palette: black #0A0A0B / surface #111113, #1A1B1E / border #26272B / gray #9CA3AF / white #FAFAFA / navy #1E3A8A (accent text #7C9CF5).

- src/index.css: navy theme tokens (lime/indigo/blue scales remapped to navy), one font family (Inter), minimum text size 11-12px, even icon sizes, 40px touch targets, safe-area support.
- Header.tsx / BottomNav.tsx / Sidebar.tsx: rebuilt for phones (equal-width bottom tabs, icon-only header actions, theme toggle moved into the side menu).
- All components: dark hex colors remapped to the new palette.
- index.html, manifest, icon.svg, sw.js (cache v3): viewport-fit=cover, theme-color, new colors.
Status colors (red = overdue/error, amber = warning, green = success) are kept on purpose.
Not built or visually tested in this environment (no node_modules/network): run `npm install && npm run build`.
