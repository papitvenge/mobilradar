import { Platform, PermissionsAndroid } from 'react-native';

let BleManager = null;
let BleManagerModule = null;
let bleManagerEmitter = null;

if (Platform.OS !== 'web') {
  try {
    const RN = require('react-native');
    const NativeModules = RN.NativeModules;
    const NativeEventEmitter = RN.NativeEventEmitter;
    BleManager = require('react-native-ble-manager').default;
    BleManagerModule = NativeModules.BleManager;
    if (BleManagerModule) {
      bleManagerEmitter = new NativeEventEmitter(BleManagerModule);
    }
  } catch (e) {
    // Expo Go mangler react-native-ble-manager – appen krasjer ikke
    console.warn('BLE not available (e.g. Expo Go):', e?.message || e);
  }
}

class BluetoothService {
  constructor() {
    this.devices = new Map();
    this.listeners = [];
    this.scanning = false;
    this.shouldScan = false;
  }

  async initialize() {
    if (Platform.OS === 'web') {
      console.log('Web platform detected - Bluetooth not available');
      return true;
    }
    if (!BleManager || !BleManagerModule) {
      console.warn('BLE native module not available (use development build for real BLE)');
      return false;
    }

    try {
      await BleManager.start({ showAlert: false });
      console.log('BLE Manager initialized');

      if (Platform.OS === 'android' && Platform.Version >= 23) {
        await this.requestAndroidPermissions();
      }

      this.setupListeners();
      return true;
    } catch (error) {
      console.error('BLE initialization error:', error);
      return false;
    }
  }

  async requestAndroidPermissions() {
    const apiLevel = Platform.Version;
    
    // Android 12 (API 31+) krever nye Bluetooth-tillatelser
    // Eldre versjoner bruker ACCESS_FINE_LOCATION for BLE-skanning
    const permissions = apiLevel >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]
      : [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];

    const granted = await PermissionsAndroid.requestMultiple(permissions);
    return Object.values(granted).every(val => val === PermissionsAndroid.RESULTS.GRANTED);
  }

  setupListeners() {
    if (!bleManagerEmitter) return;
    this.discoverListener = bleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      (peripheral) => {
        const deviceName = peripheral.name || 
          (peripheral.advertising && peripheral.advertising.localName) || 
          'Unknown';

        if (peripheral.name || (peripheral.advertising && peripheral.advertising.localName)) {
          const now = Date.now();
          const prev = this.devices.get(peripheral.id);
          const rawRssi =
            typeof peripheral.rssi === 'number'
              ? peripheral.rssi
              : prev?.rawRssi ?? null;

          let rssi = rawRssi;
          if (
            prev &&
            typeof prev.rssi === 'number' &&
            typeof rawRssi === 'number'
          ) {
            // Eksponentiell glatting for å redusere støy
            const alpha = 0.8; // vekt på tidligere verdi
            rssi = prev.rssi * alpha + rawRssi * (1 - alpha);
          }

          const distance = this.calculateDistance(rssi);
          let stableDistance = distance;
          if (
            prev &&
            typeof prev.distance === 'number' &&
            typeof distance === 'number'
          ) {
            // Enkelt hoppfilter: ignorer ekstreme sprang i én enkelt avlesning
            const maxFactor = 3;
            if (
              distance > prev.distance * maxFactor ||
              distance < prev.distance / maxFactor
            ) {
              stableDistance = prev.distance;
            }
          }

          this.devices.set(peripheral.id, {
            id: peripheral.id,
            name: deviceName,
            rssi,
            rawRssi,
            distance: stableDistance,
            lastSeen: now,
          });
          this.notifyListeners();
        }
      }
    );

    this.stopScanListener = bleManagerEmitter.addListener(
      'BleManagerStopScan',
      () => {
        this.scanning = false;
        console.log('Scan stopped');
        if (this.shouldScan) {
          // Start ny scan for å få så kontinuerlige oppdateringer som mulig
          this.startScanning();
        }
      }
    );
  }

  calculateDistance(rssi) {
    if (rssi == null || rssi === 0 || Number.isNaN(rssi)) {
      return null;
    }

    // Standard antatt RSSI ved 1 meter for BLE.
    const txPower = -59;

    // Klipp til fornuftig intervall for å unngå ekstreme utslag.
    const clipped = Math.max(-100, Math.min(-40, rssi));

    // Enkel to‑slope log-normal modell:
    // - nærmere enn ca. 3–5m: svakere demping (n ~= 2)
    // - lenger unna: sterkere demping (n ~= 3.5)
    const nearExponent = 2.0;
    const farExponent = 3.5;
    const exponent = clipped > -70 ? nearExponent : farExponent;

    const distance = Math.pow(10, (txPower - clipped) / (10 * exponent));

    // Klipp til typisk bruksområde for en mobilradar.
    const clamped = Math.max(0.1, Math.min(50, distance));
    return clamped;
  }

  async startScanning() {
    if (Platform.OS === 'web' || !BleManager) {
      if (!BleManager) console.log('Scanning not available - BLE module missing');
      return;
    }

    this.shouldScan = true;

    if (this.scanning) {
      return;
    }

    try {
      this.scanning = true;
      // allowDuplicates=true gjør at vi får kontinuerlige RSSI‑oppdateringer
      // slik at avstand/posisjon på radaren oppdateres fortløpende
      await BleManager.scan([], 8, true);
      console.log('Scanning started');
    } catch (error) {
      console.error('Scan error:', error);
      this.scanning = false;
    }
  }

  stopScanning() {
    if (Platform.OS === 'web' || !BleManager) {
      return;
    }
    this.shouldScan = false;
    this.scanning = false;
    try {
      BleManager.stopScan();
    } catch (e) {
      console.warn('stopScan:', e?.message);
    }
  }

  getDevices() {
    const now = Date.now();
    const maxAgeMs = 15000;
    const devicesWithConfidence = [];

    this.devices.forEach((device) => {
      const age = now - device.lastSeen;
      if (age < maxAgeMs) {
        const confidence = Math.max(0.2, 1 - age / maxAgeMs);
        devicesWithConfidence.push({
          ...device,
          confidence,
        });
      }
    });

    return devicesWithConfidence;
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  notifyListeners() {
    const devices = this.getDevices();
    this.listeners.forEach(listener => listener(devices));
  }

  cleanup() {
    if (Platform.OS === 'web' || !BleManager) {
      return;
    }
    this.stopScanning();
    if (this.discoverListener) {
      this.discoverListener.remove();
    }
    if (this.stopScanListener) {
      this.stopScanListener.remove();
    }
    this.devices.clear();
    this.listeners = [];
  }
}

export default new BluetoothService();
