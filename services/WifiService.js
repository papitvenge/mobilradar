import { Platform, PermissionsAndroid } from 'react-native';

let WifiManager = null;

if (Platform.OS !== 'web') {
  try {
    // Native modul fra react-native-wifi-reborn.
    // Fungerer kun i native build (ikke i Expo Go / web).
    WifiManager = require('react-native-wifi-reborn').default;
  } catch (e) {
    console.warn('WiFi module not available (e.g. Expo Go):', e?.message || e);
  }
}

class WifiService {
  constructor() {
    this.networks = new Map();
    this.listeners = [];
    this.scanning = false;
    this.scanIntervalId = null;
  }

  async initialize() {
    // Wi‑Fi‑skanning støttes kun på Android i denne appen.
    if (Platform.OS !== 'android') {
      console.log('WifiService: Wi‑Fi scanning is disabled on this platform');
      return false;
    }

    if (!WifiManager) {
      console.warn('WiFi native module not available (Android only, native build required)');
      return false;
    }

    if (Platform.OS === 'android' && Platform.Version >= 23) {
      const ok = await this.requestAndroidPermissions();
      if (!ok) {
        console.warn('WiFi permission not granted');
        return false;
      }
    }

    return true;
  }

  async requestAndroidPermissions() {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Plassering kreves for Wi‑Fi-skanning',
          message:
            'MobilRadar bruker plasseringstillatelse for å skanne etter Wi‑Fi‑nett i nærheten.',
          buttonNegative: 'Avslå',
          buttonPositive: 'Tillat',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (e) {
      console.warn('WiFi permission request failed:', e?.message || e);
      return false;
    }
  }

  startScanning() {
    if (Platform.OS !== 'android') {
      return;
    }
    if (!WifiManager) {
      return;
    }
    if (this.scanning) {
      return;
    }
    this.scanning = true;

    const scanOnce = async () => {
      if (!this.scanning) return;
      try {
        // Begrens frekvensen for å respektere Android‑restriksjoner (4 scan / 2 min).
        const results = await WifiManager.reScanAndLoadWifiList();
        this.handleScanResults(results || []);
      } catch (e) {
        console.warn('WiFi scan error:', e?.message || e);
      }
    };

    // Start umiddelbart, deretter periodisk.
    scanOnce();
    this.scanIntervalId = setInterval(scanOnce, 5000);
  }

  stopScanning() {
    this.scanning = false;
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
    }
  }

  handleScanResults(results) {
    const now = Date.now();

    results.forEach((net) => {
      const bssid = net.BSSID || net.bssid;
      if (!bssid) return;

      const prev = this.networks.get(bssid);
      const rawRssi = typeof net.level === 'number' ? net.level : prev?.rawRssi ?? null;

      let smoothedRssi = rawRssi;
      if (prev && typeof prev.rssi === 'number' && typeof rawRssi === 'number') {
        // Enkel eksponentiell glatting.
        smoothedRssi = prev.rssi * 0.6 + rawRssi * 0.4;
      }

      const { distance } = this.estimateWifiDistance(smoothedRssi, net.frequency);

      this.networks.set(bssid, {
        id: `wifi:${bssid}`,
        name: net.SSID || 'Wi‑Fi‑nett',
        type: 'wifi',
        rssi: smoothedRssi ?? null,
        rawRssi,
        distance,
        lastSeen: now,
      });
    });

    this.notifyListeners();
  }

  estimateWifiDistance(rssi, frequencyMHz) {
    if (rssi == null || Number.isNaN(rssi)) {
      return { distance: null };
    }

    // Klipp til fornuftig intervall.
    const clipped = Math.max(-100, Math.min(-35, rssi));

    // Grov modell, justerbar ved testing.
    const is5GHz = typeof frequencyMHz === 'number' && frequencyMHz >= 5000;
    const base = is5GHz ? 1.3 : 1.0;

    let distance;
    if (clipped > -50) {
      distance = 1 * base;
    } else if (clipped > -60) {
      distance = 3 * base;
    } else if (clipped > -70) {
      distance = 8 * base;
    } else {
      distance = 15 * base;
    }

    return { distance };
  }

  getDevices() {
    const now = Date.now();
    return Array.from(this.networks.values()).filter(
      (net) => now - net.lastSeen < 10000
    );
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter((l) => l !== callback);
  }

  notifyListeners() {
    const devices = this.getDevices();
    this.listeners.forEach((listener) => listener(devices));
  }

  cleanup() {
    this.stopScanning();
    this.networks.clear();
    this.listeners = [];
  }
}

export default new WifiService();

