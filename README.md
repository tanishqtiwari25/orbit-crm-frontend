# Orbit CRM frontend

Frontend-only static export of Orbit CRM using Next.js, React, FSD and React Three Fiber. The private backend, database, credentials and customer records are not included.

## Local checks

Use Node.js 24, run `npm ci`, `npm run lint`, then `npm run build`. Output is in `out/`. `scripts/secure-export.mjs` adds a hash-based Content Security Policy to each generated HTML page.

## Hosting

This authenticated business application is intended for a compatible static host, not GitHub Pages. `render.yaml` defines a free Render static site with `/api/*` forwarded to the existing private backend. Keep the existing primary domain and backend APP_URL aligned. Do not change DNS until API cookies, login, downloads, live updates and provider callbacks have been checked on the target host.

Only frontend source should be published here. Never add environment files, database exports, API secrets or customer uploads.
