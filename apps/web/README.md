# Web

## PWA (Serwist)

Production builds use **`pnpm build`** → `next build --webpack` so `@serwist/next` can emit `public/sw.js` (Turbopack does not run the Serwist webpack plugin). The generated service worker is gitignored; CI/Docker must run a full web build to produce it.

Regenerate static launcher icons from the placeholder SVG script:

```bash
node scripts/generate-pwa-icons.mjs
```

## Web Vitals

Web Vitals reporting is opt-in and disabled by default unless the flags below are set to `true`.

- `NEXT_PUBLIC_ENABLE_WEB_VITALS` - enables client-side metric reporting to `/api/web-vitals`
- `ENABLE_WEB_VITALS_LOGS` - enables server-side `[web-vitals]` console logging in the API route

Set these in your local `apps/web/.env` when needed:

```env
NEXT_PUBLIC_ENABLE_WEB_VITALS=true
ENABLE_WEB_VITALS_LOGS=true
```

## Assets storage (S3)

User uploads on the Assets page are stored under `AWS_S3_BUCKET` (default `menuyukti`) with keys `users/{clerkUserId}/{uuid}.webp`. Configure:

- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (or IAM role where the app runs)
- `AWS_REGION` — region of the bucket
- `AWS_S3_BUCKET` — bucket name (default `menuyukti`)

Objects are private; the API returns presigned GET URLs for display.

## Google Analytics

GA4 runs **site-wide** (all routes) when this is set:

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Basic page views are tracked on initial load and on client-side App Router navigations via `components/google-analytics.tsx`.

Docker image builds (GitHub Actions) pass the same ID via repository secret **`NEXT_PUBLIC_GA_MEASUREMENT_ID`** → build-arg in `apps/web/Dockerfile`; see `.github/workflows/docker-build-push.reusable.yml`.

On the print shop, digital full-resolution downloads (PDP CTA) also send **`shop_digital_download`** with **`file_name`**, **`product_slug`**, and **`link_url`**. Register those event parameters as custom dimensions in GA4 if you want them as default breakdowns in Explorations.
