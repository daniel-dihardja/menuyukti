# Print shop — S3 layout

Gallery images (preview / PDP / Open Graph) must live **only** under:

`s3://<AWS_S3_BUCKET>/menuyukti/shop/<slug>/`

Use **flat** object keys (no subfolders). Files are listed in alphabetical order and paired with catalog `imageHints` by index.

Full-resolution files for **download** must **not** share that prefix (otherwise they load in the carousel). Put them under:

`s3://<AWS_S3_BUCKET>/menuyukti/shop-deliverables/<slug>/`

The catalog `digitalDeliverable.objectKey` must match the deliverable object key exactly.

## Example: product `p-09`

From the repo root (with AWS CLI configured and `AWS_S3_BUCKET` set):

```bash
export BUCKET="${AWS_S3_BUCKET:-menuyukti}"

aws s3 cp packages/pod/products/p-09/lowres_832x1248.jpg \
  "s3://${BUCKET}/menuyukti/shop/p-09/preview.jpg"

aws s3 cp packages/pod/products/p-09/highres_6656x9984.jpg \
  "s3://${BUCKET}/menuyukti/shop-deliverables/p-09/highres_6656x9984.jpg"
```

Ensure `AWS_REGION` is set in environments where the Next.js app lists shop images (see `listShopImagesForSlug`).
