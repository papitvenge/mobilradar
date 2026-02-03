/**
 * Triangulering av BLE-enheter fra flere posisjonsavlesninger.
 * Brukeren beveger seg under skanning; vi lagrer (posisjon, avstand) per enhet
 * og beregner skjæringspunkt mellom sirkler for å estimere enhetens plassering.
 */

const METERS_PER_DEG_LAT = 110540;
const METERS_PER_DEG_LON_AT_EQUATOR = 111320;

/**
 * Konverter (lat, lon) til lokale meter relativt til referansepunkt.
 * y = nord, x = øst.
 */
export function latLonToLocalMeters(lat, lon, refLat, refLon) {
  const y = (lat - refLat) * METERS_PER_DEG_LAT;
  const x = (lon - refLon) * METERS_PER_DEG_LON_AT_EQUATOR * Math.cos((refLat * Math.PI) / 180);
  return { x, y };
}

/**
 * Avstand mellom to punkter (meter).
 */
function dist(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Skjæringspunkt mellom to sirkler.
 * c1, c2: { x, y, distance } (senter og radius i meter).
 * Returnerer 0, 1 eller 2 punkter { x, y }.
 */
function intersectTwoCircles(c1, c2) {
  const d = dist({ x: c1.x, y: c1.y }, { x: c2.x, y: c2.y });
  const r1 = c1.distance;
  const r2 = c2.distance;

  if (d <= 1e-6 && Math.abs(r1 - r2) <= 1e-6) {
    return [{ x: c1.x, y: c1.y }];
  }
  if (d > r1 + r2 + 0.01 || d < Math.abs(r1 - r2) - 0.01) {
    return [];
  }

  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const hSq = r1 * r1 - a * a;
  if (hSq < 0) return [];

  const h = Math.sqrt(hSq);
  const px = c1.x + (a * (c2.x - c1.x)) / d;
  const py = c1.y + (a * (c2.y - c1.y)) / d;

  const p1 = {
    x: px + (h * (c2.y - c1.y)) / d,
    y: py - (h * (c2.x - c1.x)) / d,
  };
  const p2 = {
    x: px - (h * (c2.y - c1.y)) / d,
    y: py + (h * (c2.x - c1.x)) / d,
  };

  if (hSq <= 1e-10) return [p1];
  return [p1, p2];
}

/**
 * Feil for et forslag (x,y) gitt avlesninger: sum av (avstand til sirkel - radius)².
 */
function errorAt(point, readings) {
  let sum = 0;
  for (const r of readings) {
    const d = dist(point, { x: r.x, y: r.y });
    sum += (d - r.distance) ** 2;
  }
  return sum;
}

/**
 * Trianguler enhetens posisjon fra liste av avlesninger.
 * readings: [{ lat, lon, distance }, ...] (minst 2 med tilstrekkelig spredning).
 * refLat, refLon: origo for lokale koordinater (f.eks. første posisjon).
 * Returnerer { x, y } i lokale meter, eller null ved for få/ dårlige data.
 */
export function triangulate(readings, refLat, refLon) {
  if (!readings || readings.length < 2) return null;

  const local = readings.map((r) => ({
    x: latLonToLocalMeters(r.lat, r.lon, refLat, refLon).x,
    y: latLonToLocalMeters(r.lat, r.lon, refLat, refLon).y,
    distance: Math.max(0.5, Number(r.distance) || 0.5),
  }));

  const minMovement = 0.3;
  const tooClose = local.slice(1).every(
    (r, i) => dist(local[0], r) < minMovement
  );
  if (tooClose) return null;

  const candidates = [];

  for (let i = 0; i < local.length; i++) {
    for (let j = i + 1; j < local.length; j++) {
      const c1 = local[i];
      const c2 = local[j];
      if (dist({ x: c1.x, y: c1.y }, { x: c2.x, y: c2.y }) < minMovement) continue;

      const points = intersectTwoCircles(c1, c2);
      for (const p of points) {
        const err = errorAt(p, local);
        candidates.push({ point: p, error: err });
      }
    }
  }

  if (!candidates.length) return null;

  // Bruk vektet gjennomsnitt av de beste kandidatene for å få mer stabile posisjoner.
  const top = candidates
    .sort((a, b) => a.error - b.error)
    .slice(0, Math.min(5, candidates.length));

  let sumW = 0;
  let sumX = 0;
  let sumY = 0;

  for (const { point, error } of top) {
    const w = 1 / (error + 1e-6);
    sumW += w;
    sumX += point.x * w;
    sumY += point.y * w;
  }

  if (sumW === 0) return null;
  return { x: sumX / sumW, y: sumY / sumW };
}

/**
 * Fra enhetens estimerte posisjon (X, Y) i lokale meter og brukerens nåværende
 * posisjon (curX, curY), gi kompassretning (0–360, 0 = nord) og avstand i meter.
 */
export function positionToAngleAndDistance(deviceX, deviceY, curX, curY) {
  const dx = deviceX - curX;
  const dy = deviceY - curY;
  const distance = Math.hypot(dx, dy);
  const angleRad = Math.atan2(dx, dy);
  let angleDeg = (angleRad * 180) / Math.PI;
  if (angleDeg < 0) angleDeg += 360;
  return { angleDeg, distance };
}
