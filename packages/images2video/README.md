# images2video

Shell + FFmpeg toolkit for turning still food photos into short motion clips. Each motion technique is an effect plugin under `effects/`.

## Prerequisites

- [FFmpeg](https://ffmpeg.org/) on your `PATH` (`ffmpeg -version`)

## Quick start

```bash
cd packages/images2video

make list-effects
make video EFFECT=ken-burns IMAGE=fixtures/single/pic-13.webp
make preview-all IMAGE=fixtures/single/pic-13.webp
make slideshow
make parallax
```

Outputs land in `output/` (gitignored).

## Effects

| Effect           | Input           | Description                                                |
| ---------------- | --------------- | ---------------------------------------------------------- |
| `ken-burns`      | single image    | Slow pan and zoom into the frame                           |
| `zoom-punch`     | single image    | Faster zoom toward a focal point (`FOCAL_X`, `FOCAL_Y`)    |
| `color-grade`    | single image    | Desaturated → warm golden grade over time; optional `LUT=` |
| `vignette-pulse` | single image    | Subtle breathing vignette on a slight zoom                 |
| `cross-dissolve` | multiple images | Smooth fade slideshow (video-only; no audio in Phase 1)    |
| `parallax`       | bg + fg layers  | Depth simulation; foreground PNG must have alpha           |

## CLI

```bash
./scripts/render.sh <effect> --image PATH [--output PATH] [--duration SEC]
./scripts/render.sh cross-dissolve --images "a.webp b.webp c.webp"
./scripts/render.sh parallax --bg PATH --fg PATH
./scripts/render-all.sh --image fixtures/single/pic-13.webp
```

## Configuration

Override via environment variables (also respected by `make` when exported):

| Variable                       | Default   | Purpose                      |
| ------------------------------ | --------- | ---------------------------- |
| `FPS`                          | 25        | Frame rate                   |
| `DURATION`                     | 5         | Clip length (seconds)        |
| `VIDEO_WIDTH` / `VIDEO_HEIGHT` | 1080×1920 | Canvas (9:16)                |
| `CRF`                          | 18        | x264 quality                 |
| `FOCAL_X` / `FOCAL_Y`          | 0.5       | Zoom punch focal point (0–1) |
| `SLIDE_DURATION`               | 3         | Seconds per slideshow slide  |
| `XFADE_DURATION`               | 1         | Crossfade length             |

## Adding an effect

1. Create `effects/my-effect.sh` with `EFFECT_ID`, `EFFECT_INPUT`, and either `effect_fg_filter()` or `effect_render()`.
2. Register the id in `effects/registry.sh`.
3. Run `make video EFFECT=my-effect IMAGE=fixtures/single/pic-13.webp`.

## Fixtures

- `fixtures/single/` — hero stills for single-image effects
- `fixtures/slideshow/` — multiple slides for cross-dissolve
- `fixtures/parallax/` — background + foreground layers ([prep notes](fixtures/parallax/README.md))
- `fixtures/luts/` — optional `.cube` LUT files for `color-grade`
