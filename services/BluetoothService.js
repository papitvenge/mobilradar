import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid } from 'react-native';
import BleManager from 'react-native-ble-manager';

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

class BluetoothService {
  constructor() {
    this.devices = new Map();
    this.listeners = [];
    this.scanning = false;
  }

  async initialize() {
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
    const permissions = [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ];

    const granted = await PermissionsAndroid.requestMultiple(permissions);
    return Object.values(granted).every(val => val === PermissionsAndroid.RESULTS.GRANTED);
  }

  setupListeners() {
    this.discoverListener = bleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      (peripheral) => {
        if (peripheral.name || peripheral.advertising?.localName) {
          this.devices.set(peripheral.id, {
            id: peripheral.id,
            name: peripheral.name || peripheral.advertising?.localName || 'Unknown',
            rssi: peripheral.rssi,
            distance: this.calculateDistance(peripheral.rssi),
            lastSeen: Date.now()
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
      }
    );
  }

  calculateDistance(rssi) {
    const txPower = -59;
    if (rssi === 0) {
      return -1.0;
    }

    const ratio = rssi * 1.0 / txPower;
    if (ratio < 1.0) {
      return Math.pow(ratio, 10);
    } else {
      const distance = (0.89976) * Math.pow(ratio, 7.7095) + 0.111;
      return Math.min(distance, 100);
    }
  }

  async startScanning() {
    if (this.scanning) {
      return;
    }

    try {
      this.scanning = true;
      await BleManager.scan([], 5, false);
      console.log('Scanning started');

      setTimeout(() => {
        if (this.scanning) {
          this.startScanning();
        }
      }, 5500);
    } catch (error) {
      console.error('Scan error:', error);
      this.scanning = false;
    }
  }

  stopScanning() {
    this.scanning = false;
    BleManager.stopScan();
  }

  getDevices() {
    const now = Date.now();
    const recentDevices = Array.from(this.devices.values()).filter(
      device => now - device.lastSeen < 10000
    );
    return recentDevices;
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
