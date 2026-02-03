import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
  Alert,
  Animated,
  Pressable,
} from 'react-native';
import * as Location from 'expo-location';
import BluetoothService from '../services/BluetoothService';
import WifiService from '../services/WifiService';
import RadarScreen from '../components/RadarScreen';
import DeviceList from '../components/DeviceList';
import VRCameraScreen from '../components/VRCameraScreen';
import { getDemoDevices } from '../utils/demoDevices';
import {
  triangulate,
  latLonToLocalMeters,
  positionToAngleAndDistance,
} from '../utils/triangulation';
import { colors, spacing, radius } from '../theme';

const isWeb = Platform.OS === 'web';
const MIN_MOVEMENT_METERS = 0.3;
const MAX_READINGS_PER_DEVICE = 50;

export default function Index() {
  const [devices, setDevices] = useState([]);
  const [wifiDevices, setWifiDevices] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [viewMode, setViewMode] = useState('radar'); // 'radar' | 'list' | 'vr'
  const [demoMode, setDemoMode] = useState(isWeb);
  const [heading, setHeading] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const lastPositionRef = useRef(null);
  const deviceReadingsRef = useRef(new Map());
  const originRef = useRef(null);
  const positionSubRef = useRef(null);
  const scanningRef = useRef(false);
  const headingRef = useRef(0);
  scanningRef.current = scanning;

  useEffect(() => {
    initBluetooth();
    initWifi();
    return () => {
      if (Platform.OS !== 'web') BluetoothService.cleanup();
      if (Platform.OS !== 'web') WifiService.cleanup();
      positionSubRef.current?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (isWeb || (viewMode !== 'radar' && viewMode !== 'vr')) return;
    let sub = null;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        sub = await Location.watchHeadingAsync(({ magHeading }) => {
          const raw = magHeading ?? 0;
          const prev = headingRef.current ?? 0;
          // Glatt heading med hensyn til wrap-around (0/360)
          let diff = raw - prev;
          if (diff > 180) diff -= 360;
          if (diff < -180) diff += 360;
          const alpha = 0.15;
          const smoothed = (prev + diff * alpha + 360) % 360;
          headingRef.current = smoothed;
          setHeading(smoothed);
        });
      } catch {
        setHeading(0);
      }
    })();
    return () => {
      sub?.remove?.();
    };
  }, [viewMode]);

  useEffect(() => {
    if (isWeb || !scanning) {
      positionSubRef.current?.remove?.();
      positionSubRef.current = null;
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || !mounted) return;
        positionSubRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 1 },
          (loc) => {
            const { latitude, longitude } = loc.coords;
            lastPositionRef.current = { lat: latitude, lon: longitude };
            if (!originRef.current) originRef.current = { lat: latitude, lon: longitude };
          }
        );
      } catch {
        lastPositionRef.current = null;
      }
    })();
    return () => {
      mounted = false;
      positionSubRef.current?.remove?.();
      positionSubRef.current = null;
    };
  }, [scanning]);

  const addReadingsFromDevices = useCallback((deviceList) => {
    const pos = lastPositionRef.current;
    if (!pos || !deviceList.length) return;
    if (!originRef.current) originRef.current = { lat: pos.lat, lon: pos.lon };

    const map = deviceReadingsRef.current;
    for (const device of deviceList) {
      if (device.distance == null || device.distance < 0) continue;
      const list = map.get(device.id) || [];
      const last = list[list.length - 1];
      const needNew =
        !last ||
        (Math.hypot(
          (pos.lat - last.lat) * 110540,
          (pos.lon - last.lon) * 111320 * Math.cos((pos.lat * Math.PI) / 180)
        ) >= MIN_MOVEMENT_METERS);
      if (!needNew) continue;
      list.push({
        lat: pos.lat,
        lon: pos.lon,
        distance: device.distance,
        timestamp: Date.now(),
      });
      if (list.length > MAX_READINGS_PER_DEVICE) list.shift();
      map.set(device.id, list);
    }
  }, []);

  const enrichWithTriangulation = useCallback((deviceList) => {
    const pos = lastPositionRef.current;
    const origin = originRef.current;
    if (!pos || !origin || !deviceList.length) return deviceList;

    const curLocal = latLonToLocalMeters(pos.lat, pos.lon, origin.lat, origin.lon);

    return deviceList.map((device) => {
      const readings = deviceReadingsRef.current.get(device.id) || [];
      const point = triangulate(readings, origin.lat, origin.lon);
      if (!point) {
        return { ...device, triangulatedAngle: null, triangulatedDistance: null };
      }
      const { angleDeg, distance } = positionToAngleAndDistance(
        point.x,
        point.y,
        curLocal.x,
        curLocal.y
      );
      return {
        ...device,
        triangulatedAngle: angleDeg,
        triangulatedDistance: distance,
      };
    });
  }, []);

  useEffect(() => {
    if (scanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [scanning]);

  const initBluetooth = async () => {
    if (Platform.OS === 'web') {
      setInitialized(true);
      return;
    }
    const success = await BluetoothService.initialize();
    if (success) {
      setInitialized(true);
      BluetoothService.addListener((deviceList) => {
        if (scanningRef.current) addReadingsFromDevices(deviceList);
        const enriched = enrichWithTriangulation(deviceList);
        setDevices(enriched);
      });
    } else {
      setInitialized(true);
      setDemoMode(true);
      Alert.alert(
        'Demo-modus',
        'Bluetooth er ikke tilgjengelig i Expo Go. Du ser nå demo-enheter. For ekte BLE-skanning: bygg appen med «expo run:ios» eller EAS Build.'
      );
    }
  };

  const initWifi = async () => {
    // Wi‑Fi-søk er kun aktivert på Android.
    if (Platform.OS !== 'android') {
      return;
    }
    const success = await WifiService.initialize();
    if (success) {
      WifiService.addListener((networkList) => {
        setWifiDevices(networkList);
      });
    }
  };

  const toggleScanning = () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Web',
        'Bluetooth-skanning er kun tilgjengelig på iOS og Android. Dette er demo på web.'
      );
      return;
    }
    if (scanning) {
      BluetoothService.stopScanning();
      if (Platform.OS === 'android') {
        WifiService.stopScanning();
      }
      setScanning(false);
    } else {
      deviceReadingsRef.current.clear();
      originRef.current = null;
      BluetoothService.startScanning();
      if (Platform.OS === 'android') {
        WifiService.startScanning();
      }
      setScanning(true);
    }
  };

  const toggleView = () => setViewMode((m) => (m === 'radar' ? 'list' : 'radar'));
  const toggleVR = () => setViewMode((m) => (m === 'vr' ? 'radar' : 'vr'));

  const combinedDevices = [...devices, ...wifiDevices];
  const displayDevices = demoMode ? getDemoDevices() : combinedDevices;

  const statusLabel = demoMode
    ? 'Demo'
    : Platform.OS === 'web'
      ? 'Web'
      : scanning
        ? 'Søker...'
        : 'Klar';

  const statusColor = demoMode
    ? colors.neonPurple
    : scanning
      ? colors.neonCyan
      : colors.neonGreen;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>MobilRadar</Text>
          <Text style={styles.tagline}>Oppdag enheter rundt deg</Text>
          <View style={[styles.statusPill, { borderColor: statusColor }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.content}>
          {viewMode === 'radar' && (
            <View style={styles.radarWrap}>
              <RadarScreen
                devices={displayDevices}
                scanning={scanning}
                heading={heading}
              />
            </View>
          )}
          {viewMode === 'list' && <DeviceList devices={displayDevices} />}
          {viewMode === 'vr' && (
            <View style={styles.vrWrap}>
              <VRCameraScreen devices={displayDevices} heading={heading} />
            </View>
          )}
        </View>

        <View style={styles.controls}>
          <Pressable
            style={({ pressed }) => [
              styles.btn,
              styles.btnView,
              pressed && styles.btnPressed,
            ]}
            onPress={toggleView}
          >
            <Text style={styles.btnText}>
              {viewMode === 'radar' ? '📋 Liste' : '📡 Radar'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.btn,
              styles.btnVR,
              pressed && styles.btnPressed,
            ]}
            onPress={toggleVR}
          >
            <Text style={styles.btnText}>
              {viewMode === 'vr' ? '🎯 Radar' : '🎥 VR'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.btn,
              styles.btnDemo,
              pressed && styles.btnPressed,
            ]}
            onPress={() => setDemoMode(!demoMode)}
          >
            <Text style={styles.btnText}>{demoMode ? 'Avslutt demo' : 'Demo'}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.btn,
              scanning ? styles.btnStop : styles.btnScan,
              pressed && styles.btnPressed,
              (!initialized || demoMode) && styles.btnDisabled,
            ]}
            onPress={toggleScanning}
            disabled={!initialized || demoMode}
          >
            <Animated.View style={{ transform: [{ scale: scanning ? pulseAnim : 1 }] }}>
              <Text style={styles.btnText}>
                {scanning ? '⏹ Stopp' : '▶ Scan'}
              </Text>
            </Animated.View>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {displayDevices.length} enhet{displayDevices.length !== 1 ? 'er' : ''}
            {demoMode && ' · demo'}
          </Text>
          {scanning && !demoMode && !isWeb && (
            <Text style={styles.triangulateHint}>
              Beveg deg litt for triangulert plassering
            </Text>
          )}
          {isWeb && (
            <Text style={styles.webHint}>
              Installer på mobil for ekte BLE-skanning
            </Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 3,
  },
  tagline: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    letterSpacing: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  vrWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  btn: {
    minWidth: 100,
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnScan: {
    backgroundColor: 'rgba(0, 255, 136, 0.12)',
    borderColor: colors.neonGreen,
  },
  btnStop: {
    backgroundColor: 'rgba(255, 51, 102, 0.15)',
    borderColor: colors.danger,
  },
  btnView: {
    backgroundColor: 'rgba(0, 245, 255, 0.08)',
    borderColor: colors.neonCyan,
  },
  btnDemo: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderColor: colors.neonPurple,
  },
  btnVR: {
    backgroundColor: 'rgba(255, 0, 170, 0.14)',
    borderColor: colors.neonMagenta,
  },
  btnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    padding: spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  triangulateHint: {
    color: colors.neonCyan,
    fontSize: 11,
    marginTop: 4,
    opacity: 0.9,
  },
  webHint: {
    color: colors.warning,
    fontSize: 11,
    marginTop: 4,
    opacity: 0.9,
  },
});
