// Source: calibration from 3 refill events cross-referenced against purchase records
// Events: 610L fill (10.70 L/cm), 916L fill (10.07 L/cm), ~200L inferred (~10.5 L/cm)
// Rectangular integrally bunded tank — conversion is linear across full 0–130 cm height range
// Update CM_TO_LITRES_RATIO here only; all UI surfaces import from this file.

/** Calibrated litres per centimetre for the heating oil tank. */
export const CM_TO_LITRES_RATIO = 10.5;

/**
 * Convert tank height to estimated litres (rounded to nearest integer).
 * Example: cmToLitres(27) === 284
 */
export function cmToLitres(heightCm: number): number {
  return Math.round(heightCm * CM_TO_LITRES_RATIO);
}
