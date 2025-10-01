import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Alert
} from 'react-native';
import BluetoothService from '../services/BluetoothService';
import RadarScreen from '../components/RadarScreen';
import DeviceList from '../components/DeviceList';

export default function Index() {
  const [devices, setDevices] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [viewMode, setViewMode] = useState('radar');

  useEffect(() => {
    initBluetooth();

    return () => {
      if (Platform.OS !== 'web') {
        BluetoothService.cleanup();
      }
    };
  }, []);

  const initBluetooth = async () => {
    if (Platform.OS === 'web') {
      setInitialized(true);
      return;
    }

    const success = await BluetoothService.initialize();
    if (success) {
      setInitialized(true);
      BluetoothService.addListener((devices) => {
        setDevices(devices);
      });
    } else {
      Alert.alert(
        'Bluetooth Error',
        'Failed to initialize Bluetooth. Please check permissions and try again.'
      );
    }
  };

  const toggleScanning = () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Web Platform',
        'Bluetooth scanning is only available on iOS and Android. This is a demo view for web.'
      );
      return;
    }

    if (scanning) {
      BluetoothService.stopScanning();
      setScanning(false);
    } else {
      BluetoothService.startScanning();
      setScanning(true);
    }
  };

  const toggleView = () => {
    setViewMode(viewMode === 'radar' ? 'list' : 'radar');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>MobilRadar</Text>
        <Text style={styles.subtitle}>
          {Platform.OS === 'web'
            ? 'Demo Mode (Web)'
            : scanning ? 'Scanning...' : 'Ready'}
        </Text>
      </View>

      <View style={styles.content}>
        {viewMode === 'radar' ? (
          <View style={styles.radarContainer}>
            <RadarScreen devices={devices} />
          </View>
        ) : (
          <DeviceList devices={devices} />
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, styles.viewButton]}
          onPress={toggleView}
        >
          <Text style={styles.buttonText}>
            {viewMode === 'radar' ? 'List View' : 'Radar View'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, scanning ? styles.stopButton : styles.startButton]}
          onPress={toggleScanning}
          disabled={!initialized}
        >
          <Text style={styles.buttonText}>
            {scanning ? 'Stop Scan' : 'Start Scan'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.info}>
        <Text style={styles.infoText}>
          Devices found: {devices.length}
        </Text>
        {Platform.OS === 'web' && (
          <Text style={styles.webWarning}>
            Install on iOS/Android for full functionality
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#00ff41',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#00ff41',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#00ff41',
    marginTop: 4,
    opacity: 0.7,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
  },
  startButton: {
    backgroundColor: '#003d1a',
    borderColor: '#00ff41',
  },
  stopButton: {
    backgroundColor: '#4d0000',
    borderColor: '#ff4444',
  },
  viewButton: {
    backgroundColor: '#001a33',
    borderColor: '#0088ff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  info: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#00ff41',
  },
  infoText: {
    color: '#00ff41',
    fontSize: 14,
  },
  webWarning: {
    color: '#ffaa00',
    fontSize: 12,
    marginTop: 8,
    opacity: 0.8,
  },
});
