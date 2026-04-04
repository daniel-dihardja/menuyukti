# Web

## Assets storage (S3)

User uploads on the Assets page are stored under `AWS_S3_BUCKET` (default `menuyukti`) with keys `users/{clerkUserId}/{uuid}.webp`. Configure:

- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (or IAM role where the app runs)
- `AWS_REGION` — region of the bucket
- `AWS_S3_BUCKET` — bucket name (default `menuyukti`)

Objects are private; the API returns presigned GET URLs for display.
