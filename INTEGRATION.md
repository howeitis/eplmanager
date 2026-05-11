# Integrating Premier League Manager into a host site

This document is for embedding `@howeitis/epl-manager` as a route in another React app — the typical case is the author's personal site (React 19 + Vite 7 + React Router v7).

The game ships as a library: `<EPLManagerApp />` is the only component you need to render. CSS is scoped so it can't leak out, Tailwind preflight is disabled, and asset URLs are configurable so the static files can live under any sub-path.

---

## Prerequisites

- Host site uses **React 19** and **react-dom 19** (peer dependencies).
- Host site can install private GitHub Packages (one-time auth, see below).
- Host site's bundler can import `.css` files (Vite, webpack, Next.js — all fine).

---

## Step 1 — Authenticate with GitHub Packages

GitHub Packages hosts private npm packages free for personal accounts. One-time setup per machine.

1. Generate a GitHub Personal Access Token with `read:packages` scope: https://github.com/settings/tokens
2. In the **host site's repo**, create `.npmrc` at the repo root:

   ```ini
   @howeitis:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```

3. Export `GITHUB_TOKEN` in your shell (and in CI). Don't commit the token itself — the `.npmrc` references it via env var.

   ```bash
   export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
   ```

4. Add `.npmrc` to the host repo's `.gitignore` if it ever ends up containing the literal token. (The form above is safe to commit.)

---

## Step 2 — Install

From the host site:

```bash
npm install @howeitis/epl-manager
```

This installs the game's dependencies (Zustand, idb-keyval, seedrandom, @react-spring/web, etc.). React and react-dom are *peer* deps — they resolve to whatever the host already has.

---

## Step 3 — Copy the static assets

The game expects club logos, national flags, national team logos, and the brand artwork to be served as static files. They are **not** shipped inside the npm bundle — that would bloat every install with ~30 MB of images that change rarely.

Copy the contents of this repo's `public/` directory into the host site's `public/games/epl-manager/`:

```
host-site/public/games/epl-manager/
├── Premier League Clubs Logos/
├── national flags/
├── National team logos/
├── eplmanager_logo_clean.png
└── epl_manager_hero.webp
```

The cleanest way: from this repo, zip `public/` and unzip it into the host's `public/games/epl-manager/`. Re-run the copy any time the game ships new assets (rare).

---

## Step 4 — Add the route

Anywhere in the host's router — for React Router v7:

```tsx
// host-site/src/routes/games/EPLManagerRoute.tsx
import { lazy, Suspense } from 'react';
import '@howeitis/epl-manager/style.css';

// Lazy-load: the game is ~205 KB gzip JS, no reason to ship it
// to visitors who don't open this route.
const EPLManagerApp = lazy(() =>
  import('@howeitis/epl-manager').then((m) => ({ default: m.EPLManagerApp }))
);

export default function EPLManagerRoute() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading game…</div>}>
      <EPLManagerApp assetBasePath="/games/epl-manager" />
    </Suspense>
  );
}
```

Then register it:

```tsx
// host-site/src/router.tsx (excerpt)
import EPLManagerRoute from './routes/games/EPLManagerRoute';

// ...
{ path: '/games/epl-manager', element: <EPLManagerRoute /> }
```

That's it. Visit `/games/epl-manager` on the host site and the game runs.

---

## Step 5 — (Recommended) Load the fonts

The game uses Playfair Display (display) and DM Sans (body). If your host site already loads these fonts, you can skip. Otherwise add the same `<link>` the game's standalone `index.html` uses:

```html
<!-- host-site/index.html (head) -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
  rel="stylesheet"
/>
```

If the fonts are missing, the game falls back to system serifs/sans — readable but not the editorial look it's designed for.

---

## What's safe from leaking

| Concern | How it's handled |
|---|---|
| Tailwind utility classes | All prefixed `plm-`. Can't collide with host's CSS. |
| Tailwind preflight (`*`, `body` resets) | **Disabled** in the package's Tailwind build. |
| Game's own base styles (font, box-sizing, scrollbars) | All scoped under `.plm-app-root` selector. |
| Game's `<h1>` / `<h2>` headings | Serif font only applied inside `.plm-app-root`. |
| Asset URLs | Configurable via `assetBasePath` prop. |
| IndexedDB saves | Keyed `epl-manager-save-1/2/3` — own namespace. |

---

## Updating the game

The development loop is now:

1. In the **game repo**: edit, test (`npm test`), commit, push.
2. Bump version: `npm version patch` (or `minor` / `major`).
3. Publish: `npm publish`.
4. In the **host repo**: `npm update @howeitis/epl-manager` and redeploy.

The host site stays pinned to whatever version is in its `package.json` until you choose to update. No surprise breakage from upstream changes.

---

## Troubleshooting

**"Module not found: @howeitis/epl-manager"**
Check `.npmrc` is at the repo root and `GITHUB_TOKEN` is exported. Run `npm install` again.

**"Cannot find module 'react'" at runtime**
React isn't bundled. Make sure the host site has `react@^19` and `react-dom@^19` installed.

**Club logos / flags don't load (404s in DevTools)**
The `assetBasePath` prop doesn't match where you copied the static files. Check the network tab — the requested URL should match a file actually on disk in `host-site/public/`.

**Host site's body styles are different now**
Should not happen — preflight is disabled and our resets are scoped. If it does, file an issue: someone added a global rule outside `.plm-app-root`.

**Game's headings look wrong**
You're probably missing the Google Fonts `<link>`. See Step 5.
