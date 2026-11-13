# Hosting PortfolioWorks

This package is a **hosting-ready** copy of the Phase 2 site: full source plus a prebuilt Node.js production bundle. It is meant to be uploaded to a host, not opened as a folder of static HTML files.

**Current review (staging) URL:** https://portfolioworks-staging.vercel.app

The live production site (https://portfolioworks-site.vercel.app) is separate and is not changed by unpacking or running this package.

## What is in this zip

| Path | What it is |
|---|---|
| Everything except `standalone/` | Full Next.js 15 source (no `node_modules`, no `.next`, no secret `.env` files). Includes `.env.example`. |
| `standalone/` | Prebuilt production server: `server.js`, `.next/static`, `public`, and the traced Node modules. Run with `node server.js`. |
| `HOSTING.md` | This file. |
| `README.md` | Project overview, local development, and links to docs. |

A **pure static HTML export** (`next export` / `output: 'export'`) is **not possible**. The site has API routes for lead forms, health checks, CRM webhooks, uploads and (where applicable) payments. Those need a Node.js server.

## Requirements

- **Node.js 20 or 22** (22.x preferred). Node 18 is not recommended for this Next.js 15 release.
- Environment variables from `.env.example` (see below). For a first smoke test, most can be left unset; forms that need a database will fail closed in production.

GET /api/health reports which integrations have credentials.

## 1. Recommended: Vercel (upload)

This is how the staging previews are hosted today (upload deploy, not Git-linked).

1. Install the Vercel CLI and log in to the **space-up-solutions** team (or your own team).
2. In a clean copy of the **source** (not the `standalone/` folder):

```bash
# from the unzipped project root
rm -rf standalone   # do not upload the prebuilt bundle to Vercel
npx vercel link --yes --project portfolioworks-site --scope space-up-solutions
# Preview only — never use --prod unless the owner has approved a production release
npx vercel --yes
```

3. Assign or confirm the staging alias `https://portfolioworks-staging.vercel.app` on that **preview** deployment.
4. Set environment variables in the Vercel project (Preview vs Production separately). For preview/staging, keep `SITE_NOINDEX=1` (or the project's equivalent) so the review site is not indexed.
5. Confirm `https://your-preview-url/api/health` returns HTTP 200.

Do **not** set `BUILD_STANDALONE=1` on Vercel. That flag is only for the generic Node bundle in `standalone/`. Vercel builds use the default Next.js output.

## 2. Netlify

Netlify can run Next.js 15 via the official Next.js runtime (`@netlify/plugin-nextjs`), but this project was built and verified on Vercel. If you must use Netlify:

1. Import the **source** root (exclude `standalone/`).
2. Build command: `npm ci --include=dev && npm run build`
3. Do not set `BUILD_STANDALONE=1`.
4. Add the same environment variables as in `.env.example`.
5. After deploy, check `/` and `/api/health`.

API routes, the Next.js image optimiser and middleware need the Next runtime — a "static site" Netlify publish of `out/` will not work.

## 3. Generic VPS / Node (pm2)

Use the prebuilt `standalone/` folder. You do not need to run `npm install` or `next build` on the server if you ship this zip as-is.

```bash
# on the server
unzip portfolioworks-site-phase2-hosting.zip
cd portfolioworks-site-phase2-hosting/standalone
cp ../.env.example .env   # then edit — at least NEXT_PUBLIC_SITE_URL
# listening address
export HOSTNAME=0.0.0.0
export PORT=3000
node server.js
```

With pm2:

```bash
cd portfolioworks-site-phase2-hosting/standalone
# create .env first
npx pm2 start server.js --name portfolioworks-site --env production
npx pm2 save && npx pm2 startup
```

Put Nginx or Caddy in front (HTTPS, `proxy_pass` to `http://127.0.0.1:3000`). Example Nginx location:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

To rebuild the standalone bundle from source later (Node 20/22):

```bash
cd portfolioworks-site-phase2-hosting
npm ci --include=dev
cp .env.example .env.local   # or export the vars
BUILD_STANDALONE=1 npm run build
rm -rf standalone
cp -a .next/standalone standalone
cp -a .next/static standalone/.next/static
cp -a public standalone/public
```

`BUILD_STANDALONE` is ignored when `VERCEL` is set, so a Vercel build never switches to this output.

## 4. cPanel Node.js app

1. Unzip on the server and point the cPanel **Node.js** application at the `standalone/` directory.
2. Application startup file: `server.js`
3. Node.js version: 22 (or 20).
4. Set `HOSTNAME=0.0.0.0` and `PORT` to the port cPanel assigns (or the one in the Node.js app settings).
5. Add environment variables in the cPanel UI (same list as `.env.example`).
6. Do not use the "Passenger" static-root / `public/` only mode — the app must start `server.js`.
7. Visit `/` and `/api/health` once the app is running.

If cPanel insists on an `app.js` filename, copy or symlink `server.js` to `app.js`.

## Environment variables

Copy `.env.example` to `.env` (standalone) or `.env.local` (source dev/build) and fill in only what you need.

Required to accept leads in production:
- A durable store: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`, or Supabase. Do not set `LEAD_ALLOW_MEMORY_STORE=1` on a public production host.

Common optional integrations (all off until set — see `.env.example`):
- Site URL: `NEXT_PUBLIC_SITE_URL`
- GoHighLevel location, pipeline and stage IDs
- Analytics (consent-gated): GA4, GTM, Google Ads, Meta Pixel, OpenAI Ads
- Turnstile, admin credentials

Never commit a filled `.env` file. This zip does not include secrets.

## Smoke test after hosting

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://YOUR-HOST/
curl -sS -o /dev/null -w "%{http_code}\n" https://YOUR-HOST/api/health
```

Both should return `200`. Then submit a test lead on a preview/staging host (not production) and confirm it appears in logs or your store.

## Local development (from source)

```bash
npm ci --include=dev
cp .env.example .env.local
npm run dev
# in another terminal: npm run typecheck && npm test && npm run build
```

See `README.md` for product context and the `docs/` folder for integration setup.
