/**
 * Responsive `sizes` helpers for object-cover photos.
 *
 * With `object-fit: cover`, a photo is often drawn wider than its box (a landscape photo in a tall
 * mobile hero or a portrait card), so a plain "100vw" / "33vw" makes the browser pick a variant that
 * is too small and the photo looks soft. These helpers ask for proportionally larger variants.
 * They never upscale: next/image caps every variant at the source file's own width.
 */

/** Full-bleed hero/banner photos (callers pass sizes="100vw"). */
export const FULL_BLEED_SIZES = "(max-width: 767px) 250vw, (max-width: 1279px) 160vw, 100vw";

/** Scale only the slot lengths in a `sizes` string (never the media-condition px values). */
export function coverSizes(sizes: string, factor = 1.5): string {
  if (sizes.trim() === "100vw") return FULL_BLEED_SIZES;
  return sizes
    .split(",")
    .map((part) => {
      const t = part.trim();
      const m = t.match(/^(.*?)(\d+(?:\.\d+)?)(vw|px)$/);
      if (!m || t.includes("calc(")) return t;
      return `${m[1]}${Math.round(parseFloat(m[2]) * factor)}${m[3]}`;
    })
    .join(", ");
}

/** next/image quality: heroes 90, everything else 85 (allowed values are listed in next.config images.qualities). */
export const heroQuality = 90;
export const photoQuality = 85;
