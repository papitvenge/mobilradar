import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '../theme';
import {
  deviceAngleFromId,
  normalizeAngleDelta,
  formatDistance,
} from '../utils/measurements';

const FOV_DEG = 60; // antatt horisontalt synsfelt til kameraet

const VRCameraScreen = ({ devices = [], heading = 0 }) => {
  const { width, height } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [hasAsked, setHasAsked] = useState(false);

  useEffect(() => {
    if (!permission && !hasAsked) {
      setHasAsked(true);
      requestPermission();
    }
  }, [permission, hasAsked, requestPermission]);

  if (!permission || !permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Kamera kreves for VR-modus</Text>
        <Text style={styles.permissionText}>
          Gi tilgang til kamera i systeminnstillingene for å se radar-funn som varmesignaturer
          oppå kamerabildet.
        </Text>
      </View>
    );
  }

  const visibleDevices = devices
    .map((device) => {
      const angle = device.triangulatedAngle ?? deviceAngleFromId(device.id);
      const distance = device.triangulatedDistance ?? device.distance;
      if (distance == null || distance <= 0) return null;

      const delta = normalizeAngleDelta(angle - heading);
      const halfFov = FOV_DEG / 2;
      if (Math.abs(delta) > halfFov + 15) {
        return null;
      }

      const t = (delta + halfFov) / (2 * halfFov);
      const clampedT = Math.max(0, Math.min(1, t));

      // Normaliser avstand til [0, 1] innenfor et "bruksområde"
      const NEAR_M = 0.5;
      const FAR_M = 15;
      const dClamped = Math.max(NEAR_M, Math.min(FAR_M, distance));
      const distNorm = (dClamped - NEAR_M) / (FAR_M - NEAR_M); // 0 = nær, 1 = langt unna

      // Horisontal plassering innenfor skjermbredden
      const screenX = clampedT * width;

      // Vertikal plassering: nærmere enheter litt lavere, fjernere litt høyere
      const baseY = height * 0.55;
      const verticalRange = height * 0.25;
      const screenY = baseY - verticalRange * (1 - distNorm);

      // Størrelse og intensitet på heat‑blobben basert på avstand
      const blobSize = 90 + (1 - distNorm) * 50; // 90–140 px
      const coreSize = blobSize * 0.32;
      const intensity =
        distance < 2 ? 1 : distance < 5 ? 0.8 : distance < 10 ? 0.55 : 0.35;

      return {
        ...device,
        _screenX: screenX,
        _screenY: screenY,
        _blobSize: blobSize,
        _coreSize: coreSize,
        _intensity: intensity,
      };
    })
    .filter(Boolean);

  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" />

      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.topHud}>
          <Text style={styles.hudTitle}>VR-modus</Text>
          <Text style={styles.hudSub}>
            Beveg telefonen rolig rundt – varmefelt viser hvor enhetene er foran deg
          </Text>
        </View>

        {visibleDevices.map((device) => {
          const blobSize = device._blobSize ?? 120;
          const coreSize = device._coreSize ?? 32;
          return (
            <View
              key={device.id}
              style={[
                styles.heatBlob,
                {
                  left: device._screenX - blobSize / 2,
                  top: device._screenY - blobSize / 2,
                  width: blobSize,
                  height: blobSize,
                  borderRadius: blobSize / 2,
                  opacity: device._intensity,
                },
              ]}
            >
              <View
                style={[
                  styles.heatCore,
                  {
                    width: coreSize,
                    height: coreSize,
                    borderRadius: coreSize / 2,
                  },
                ]}
              />
              <View style={styles.label}>
                <Text style={styles.labelName} numberOfLines={1}>
                  {device.name || 'Ukjent'}
                </Text>
                <Text style={styles.labelDistance}>
                  {formatDistance(device.triangulatedDistance ?? device.distance)}
                </Text>
              </View>
            </View>
          );
        })}

        <View style={styles.bottomHud}>
          <Text style={styles.bottomText}>
            {visibleDevices.length} funn i synsfeltet · kompass {Math.round(heading)}°
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    overflow: 'hidden',
    borderRadius: 18,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topHud: {
    paddingTop: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(5, 5, 12, 0.55)',
  },
  hudTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neonCyan,
    letterSpacing: 1.2,
  },
  hudSub: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
  },
  heatBlob: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 0, 128, 0.16)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 0, 170, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heatCore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 0, 170, 0.9)',
    shadowColor: colors.neonMagenta,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 4,
  },
  label: {
    position: 'absolute',
    bottom: -28,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(5, 5, 12, 0.95)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelName: {
    maxWidth: 120,
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  labelDistance: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neonGreen,
  },
  bottomHud: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(5, 5, 12, 0.7)',
  },
  bottomText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  permissionContainer: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default VRCameraScreen;

