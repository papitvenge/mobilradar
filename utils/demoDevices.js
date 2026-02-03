/**
 * Mock BLE-enheter for Expo-demo (web eller presentasjon uten ekte enheter).
 * Strukturen matcher det BluetoothService returnerer: id, name, rssi, distance, lastSeen.
 */
const MOCK_DEVICES = [
  { id: 'demo-1', name: 'iPhone', rssi: -65, distance: 3, lastSeen: Date.now() },
  { id: 'demo-2', name: 'AirPods', rssi: -72, distance: 5, lastSeen: Date.now() },
  { id: 'demo-3', name: 'Watch', rssi: -80, distance: 8, lastSeen: Date.now() },
  { id: 'demo-4', name: 'Speaker', rssi: -55, distance: 1.5, lastSeen: Date.now() },
  { id: 'demo-5', name: 'Tablet', rssi: -88, distance: 12, lastSeen: Date.now() },
];

export function getDemoDevices() {
  return MOCK_DEVICES.map((d) => ({ ...d, lastSeen: Date.now() }));
}
