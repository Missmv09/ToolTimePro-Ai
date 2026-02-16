/**
 * Color contrast utilities for ensuring readable text on backgrounds.
 * Uses WCAG 2.1 relative luminance and contrast ratio formulas.
 */

/** Parse a hex color string to { r, g, b } (0–255). */
export function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return { r: 0, g: 0, b: 0 };
  const h = hex.replace('#', '');
  const full = h.length === 3
    ? h.split('').map((c) => c + c).join('')
    : h;
  const num = parseInt(full, 16);
  if (isNaN(num)) return { r: 0, g: 0, b: 0 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

/** Relative luminance per WCAG 2.1. */
export function luminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Contrast ratio between two hex colors (range 1–21). */
export function contrastRatio(hex1, hex2) {
  const l1 = luminance(hexToRgb(hex1));
  const l2 = luminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns a readable text color for a given background.
 *
 * - If `textHex` has at least `minRatio` contrast against `bgHex`, use it.
 * - Otherwise try `fallbackHex`.
 * - Last resort: pick dark or light based on background luminance.
 *
 * @param {string} textHex    - Chosen text color (may be '' or null)
 * @param {string} bgHex      - Background the text sits on
 * @param {string} fallbackHex - Preferred fallback (e.g. primaryColor or '#333333')
 * @param {number} [minRatio]  - Minimum contrast ratio (default 3 = WCAG AA large text)
 */
export function ensureReadableColor(textHex, bgHex, fallbackHex, minRatio = 3) {
  if (textHex && contrastRatio(textHex, bgHex) >= minRatio) return textHex;
  if (fallbackHex && contrastRatio(fallbackHex, bgHex) >= minRatio) return fallbackHex;
  // Last resort: choose dark or light based on background brightness
  const bgLum = luminance(hexToRgb(bgHex || '#ffffff'));
  return bgLum > 0.5 ? '#1a1a2e' : '#ffffff';
}
