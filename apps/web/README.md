# Web

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

## Print shop (Google Analytics)

GA4 runs **only under `/shop`** when this is set:

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Docker image builds (GitHub Actions) pass the same ID via repository secret **`NEXT_PUBLIC_GA_MEASUREMENT_ID`** → build-arg in `apps/web/Dockerfile`; see `.github/workflows/docker-build-push.reusable.yml`.

Digital full-resolution downloads (PDP CTA) also send **`shop_digital_download`** with **`file_name`**, **`product_slug`**, and **`link_url`**. Register those event parameters as custom dimensions in GA4 if you want them as default breakdowns in Explorations.
