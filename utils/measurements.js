/**
 * Felles verktøy for avstand, vinkler og ID-baserte pseudo-vinkler.
 * Brukes av både radar- og VR-visningen for konsekvent oppførsel.
 */

/**
 * Stabil hash av streng → heltall (kan være negativt, tas absolutt).
 */
export function hashStr(str) {
  let h = 0;
  if (!str) return 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * Pseudo-vinkel (0–360°) når vi ikke har triangulert retning.
 * Gir stabil, men vilkårlig retning basert på enhetens ID.
 */
export function deviceAngleFromId(deviceId) {
  return hashStr(String(deviceId)) % 360;
}

/**
 * Normaliserer en vinkel-differanse til intervallet [-180, 180].
 */
export function normalizeAngleDelta(delta) {
  let d = ((delta + 540) % 360) - 180;
  if (d < -180) d += 360;
  return d;
}

/**
 * Formatter avstand i meter til menneske-lesbar tekst.
 * - Under 1m: centimeter
 * - Ellers: én desimal i meter
 */
export function formatDistance(distance) {
  if (distance == null || distance < 0 || Number.isNaN(distance)) return '—';
  if (distance < 1) return `${(distance * 100).toFixed(0)} cm`;
  return `${distance.toFixed(1)} m`;
}

