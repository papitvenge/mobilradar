import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import Svg, { Circle, Line, Defs, RadialGradient, Stop, G } from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const radarSize = Math.min(screenWidth, screenHeight) * 0.85;
const centerX = radarSize / 2;
const centerY = radarSize / 2;

const RadarScreen = ({ devices = [] }) => {
  const sweepAnim = useRef(new Animated.Value(0)).current;
  const pulseAnims = useRef({}).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(sweepAnim, {
        toValue: 360,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const getDevicePulseAnim = (deviceId) => {
    if (!pulseAnims[deviceId]) {
      pulseAnims[deviceId] = new Animated.Value(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnims[deviceId], {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnims[deviceId], {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
    return pulseAnims[deviceId];
  };

  const positionDevice = (distance, index, total) => {
    const maxRadius = (radarSize / 2) * 0.85;
    const radius = Math.min((distance / 100) * maxRadius, maxRadius);
    const angle = ((360 / Math.max(total, 1)) * index * Math.PI) / 180;

    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  };

  return (
    <View style={styles.container}>
      <Svg width={radarSize} height={radarSize} style={styles.svg}>
        <Defs>
          <RadialGradient id="radarGradient" cx="50%" cy="50%">
            <Stop offset="0%" stopColor="#001a33" stopOpacity="1" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="1" />
          </RadialGradient>
        </Defs>

        <Circle
          cx={centerX}
          cy={centerY}
          r={radarSize / 2}
          fill="url(#radarGradient)"
        />

        {[0.25, 0.5, 0.75, 1].map((scale, i) => (
          <Circle
            key={i}
            cx={centerX}
            cy={centerY}
            r={(radarSize / 2) * scale * 0.85}
            stroke="#00ff41"
            strokeWidth="1"
            fill="none"
            opacity={0.3}
          />
        ))}

        <Line
          x1={centerX}
          y1={centerY - (radarSize / 2) * 0.85}
          x2={centerX}
          y2={centerY + (radarSize / 2) * 0.85}
          stroke="#00ff41"
          strokeWidth="1"
          opacity={0.2}
        />
        <Line
          x1={centerX - (radarSize / 2) * 0.85}
          y1={centerY}
          x2={centerX + (radarSize / 2) * 0.85}
          y2={centerY}
          stroke="#00ff41"
          strokeWidth="1"
          opacity={0.2}
        />

        <Circle
          cx={centerX}
          cy={centerY}
          r="8"
          fill="#00ff41"
          opacity={0.8}
        />

        {devices.map((device, index) => {
          const pos = positionDevice(device.distance, index, devices.length);
          return (
            <G key={device.id}>
              <Circle
                cx={pos.x}
                cy={pos.y}
                r="6"
                fill="#00ff41"
                opacity={0.9}
              />
              <Circle
                cx={pos.x}
                cy={pos.y}
                r="12"
                fill="none"
                stroke="#00ff41"
                strokeWidth="2"
                opacity={0.5}
              />
            </G>
          );
        })}
      </Svg>

      {devices.map((device, index) => {
        const pos = positionDevice(device.distance, index, devices.length);
        const pulseAnim = getDevicePulseAnim(device.id);
        const scale = pulseAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 2],
        });
        const opacity = pulseAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.6, 0],
        });

        return (
          <Animated.View
            key={`pulse-${device.id}`}
            style={[
              styles.pulse,
              {
                left: pos.x - 15,
                top: pos.y - 15,
                transform: [{ scale }],
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: radarSize,
    height: radarSize,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  pulse: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#00ff41',
  },
});

export default RadarScreen;
