# Parallax fixture prep

Parallax simulates depth by moving a **foreground** cutout faster than a **background** plate.

## Required assets

| File                 | Description                                                              |
| -------------------- | ------------------------------------------------------------------------ |
| `bg.webp` / `bg.jpg` | Full scene or blurred background plate                                   |
| `fg.png`             | Foreground subject with **alpha channel** (transparent outside the dish) |

Both layers should share the same aspect ratio and alignment. Export them from the same source frame in your image editor so edges line up when composited.

## Workflow (image editor)

1. Start from one hero food photo.
2. Duplicate the layer and create a background plate (blur, crop, or inpaint the subject area).
3. On the foreground layer, cut out the dish and export as PNG with transparency.
4. Save the background as `bg.webp` and foreground as `fg.png` in this folder.

## Test render

```bash
make parallax BG=fixtures/parallax/bg.webp FG=fixtures/parallax/fg.png
```

The bundled `fg.png` is a circular alpha mask over the same photo — enough to verify the pipeline. Replace with a real cutout for production tests.
