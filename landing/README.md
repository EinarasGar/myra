# landing

The static marketing site served at `sverto.com`. The SPA in `../web` is served at
`app.sverto.com`.

It exists because the SPA ships `<div id="root"></div>` and nothing else, so every link
unfurler (Reddit, HN, Slack, Twitter) previews it as a blank card. This site renders the
same page to complete HTML at build time.

## Running it

```sh
make landing-run      # dev server on LANDING_PORT, pointing at the local SPA
make landing-build    # static build into landing/dist
```

Both targets supply the two required variables. Set them yourself if you run `astro`
directly — the config throws without `PUBLIC_SITE_URL`:

| Variable          | What it is                                     |
| ----------------- | ---------------------------------------------- |
| `PUBLIC_SITE_URL` | This site's origin. Canonical URL and sitemap. |
| `PUBLIC_APP_URL`  | The SPA's origin. Every `/signup`, `/login`.   |

Override the production values with `make landing-build LANDING_SITE_URL=… LANDING_APP_URL=…`.

## How it reuses the app

`src/landing/` is the page. It imports the app's design system across a `@/*` alias pointed
at `../web/src`, so `Figure`, `Button`, `Sheet`, `Table`, the mock ledger and the token layer
have exactly one copy each and cannot drift.

Nothing enforces that alias except `src/landing/import-boundary.test.ts`. It walks the real
module graph out of every `.astro` file and fails if anything reachable imports `@/auth`,
`@/lib/query`, `@/lib/api`, `@clerk/*`, `@tanstack/react-router` or any other app-only
module. Adding a new island or page puts it inside the boundary automatically — the entry
points are read from the `.astro` files, not from a list.

`tests/served-html.test.ts` asserts against `dist/index.html` rather than a React render,
because the guarantee is about the bytes a crawler receives. Run `bun run build` first, or
just `bun run verify`.

## Zero JS, with one exception

The page is static HTML. The only client bundle is the commit feed, mounted as an island
with `client:media="(min-width: 1024px)"`, so below 1024px no JavaScript is downloaded at
all. The `hidden lg:block` wrapper around it is what hides the server-rendered skeleton on
phones — the width gate moved from `useShellWidth` to CSS.

## Open Graph image

`public/og-dashboard.png` is a 1200×630 crop of `public/shots/ledger-dark.png`. If the
dashboard screenshot is retaken, regenerate it: crop the new shot to a 1200:630 aspect
ratio, resize to 1200×630, and overwrite the file — the meta tags need no change.
