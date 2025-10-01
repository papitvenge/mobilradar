import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const DeviceList = ({ devices = [] }) => {
  const formatDistance = (distance) => {
    if (distance < 1) {
      return `${(distance * 100).toFixed(0)} cm`;
    }
    return `${distance.toFixed(1)} m`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Detected Devices: {devices.length}</Text>
      <ScrollView style={styles.list}>
        {devices.length === 0 ? (
          <Text style={styles.emptyText}>Scanning for nearby devices...</Text>
        ) : (
          devices.map((device) => (
            <View key={device.id} style={styles.deviceItem}>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={styles.deviceId} numberOfLines={1}>
                  {device.id}
                </Text>
              </View>
              <View style={styles.deviceStats}>
                <Text style={styles.distance}>{formatDistance(device.distance)}</Text>
                <Text style={styles.rssi}>{device.rssi} dBm</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00ff41',
    marginBottom: 12,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  emptyText: {
    color: '#00ff41',
    textAlign: 'center',
    marginTop: 20,
    opacity: 0.6,
  },
  deviceItem: {
    backgroundColor: '#001a33',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#00ff41',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  deviceName: {
    color: '#00ff41',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceId: {
    color: '#00ff41',
    fontSize: 11,
    opacity: 0.5,
  },
  deviceStats: {
    alignItems: 'flex-end',
  },
  distance: {
    color: '#00ff41',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  rssi: {
    color: '#00ff41',
    fontSize: 12,
    opacity: 0.7,
  },
});

export default DeviceList;
