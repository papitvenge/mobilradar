import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Magnetometer } from 'expo-sensors';
import { NativeModules } from 'react-native';

const { CellModule } = NativeModules;

export default function App() {
  const [heading, setHeading] = useState(0);
  const [cells, setCells] = useState([]);

  useEffect(() => {
    // Magnetometer
    Magnetometer.addListener(({ x, y }) => {
      const angle = Math.atan2(y, x) * (180 / Math.PI);
      setHeading(angle >= 0 ? angle : 360 + angle);
    });

    // Hent celledata hvert 2. sekund
    const interval = setInterval(() => {
      CellModule.getCellInfo()
        .then(data => setCells(JSON.parse(data)))
        .catch(console.error);
    }, 2000);

    return () => {
      Magnetometer.removeAllListeners();
      clearInterval(interval);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Retning: {Math.round(heading)}°</Text>
      <Text style={styles.text}>Antall celler: {cells.length}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#ff0',
    fontSize: 24,
    margin: 10,
  }
});
