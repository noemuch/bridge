# Bridge — README assets

This directory holds the visual assets referenced from the project `README.md`.

## Inventory

| File | Purpose | Status |
|------|---------|--------|
| `banner-placeholder.png` | Header banner shown at the top of the README. | **Placeholder** — replace with final banner. |
| `demo-placeholder.png` | Demo screenshot or GIF showing Bridge generating a Figma design from a natural-language description. | **Placeholder** — replace with an actual capture. |

## Guidelines

- **Banner:** `1600 × 400` PNG (or SVG), centered wordmark on a neutral background. Keep visible area safe for `width="600"` rendering in the README.
- **Demo:** animated GIF or high-resolution PNG at `2400 × 1400`, rendered at `width="800"` in the README. Prefer a short loop showing `make <description>` → CSpec → Figma output.
- Keep file size under **2 MB** for demo assets to avoid slow README loads.
- Do **not** commit editable source files (`.fig`, `.psd`, `.sketch`) here — export to PNG/GIF/MP4 first.

## Replacing the placeholders

1. Export the final banner/demo from Figma (or your tool of choice).
2. Save to this directory with the target filename (`banner.png`, `demo.gif`, …).
3. Update the `<img src="…">` paths in `README.md` accordingly.
4. Remove the placeholders once the real assets are in place.
