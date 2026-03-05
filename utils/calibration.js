const asPositiveNumber = (value) => {
  if (value == null) return null;
  const parsed = Number.parseFloat(String(value).replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

export const computeCalibration = (measurements) => {
  const factors = [];

  for (const measurement of measurements) {
    const actualMm = asPositiveNumber(measurement.actualMm);
    const scannedMm = asPositiveNumber(measurement.scannedMm);
    if (!actualMm || !scannedMm) continue;
    factors.push(actualMm / scannedMm);
  }

  if (factors.length === 0) {
    return {
      validCount: 0,
      scaleFactor: 1,
      confidence: 'Ingen kalibrering',
      deviationPercent: null,
    };
  }

  const scaleFactor = factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
  const deviationPercent =
    factors.reduce((sum, factor) => sum + Math.abs(factor - scaleFactor), 0) / factors.length /
    scaleFactor *
    100;

  let confidence = 'Lav sikkerhet';
  if (factors.length >= 3 && deviationPercent <= 1.5) confidence = 'Høy sikkerhet';
  else if (factors.length >= 2 && deviationPercent <= 3) confidence = 'Middels sikkerhet';

  return {
    validCount: factors.length,
    scaleFactor,
    confidence,
    deviationPercent,
  };
};

export const applyScaleToDimensions = (dimensions, scaleFactor) => {
  if (!dimensions) return null;
  return {
    widthMm: dimensions.widthMm * scaleFactor,
    heightMm: dimensions.heightMm * scaleFactor,
    depthMm: dimensions.depthMm * scaleFactor,
  };
};

export const createMockRawDimensions = (objectName) => {
  const seed = [...objectName].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const base = Math.max(80, objectName.trim().length * 15);
  return {
    widthMm: base + (seed % 160),
    heightMm: base * 0.75 + ((seed * 3) % 110),
    depthMm: base * 0.55 + ((seed * 7) % 95),
  };
};

export const formatMm = (value) => `${value.toFixed(1)} mm`;
