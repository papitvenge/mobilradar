import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from 'react-native';
import Svg, {
  Circle,
  Line,
  Defs,
  RadialGradient,
  Stop,
  G,
} from 'react-native-svg';
import { colors } from '../theme';
import { deviceAngleFromId, formatDistance } from '../utils/measurements';

const CARDINALS = ['N', 'NE', 'Ø', 'SE', 'S', 'SV', 'V', 'NV'];
// Zoom-steg i meter (min 0.2m, maks 200m)
const RANGE_STEPS = [0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200];

function angleToCardinal(deg) {
  const index = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return CARDINALS[index];
}

const RadarScreen = ({ devices = [], scanning = false, heading = 0 }) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const radarSize = Math.min(screenWidth, screenHeight) * 0.88;
  const centerX = radarSize / 2;
  const centerY = radarSize / 2;
  const maxR = (radarSize / 2) * 0.88;
  const sweepAnim = useRef(new Animated.Value(0)).current;
  const pulseAnims = useRef({}).current;
  const [rangeIndex, setRangeIndex] = useState(6); // starter på 20m
  const rangeMax = RANGE_STEPS[rangeIndex];
  const pinchBaseDistanceRef = useRef(null);

  useEffect(() => {
    if (!scanning) return;
    const loop = Animated.loop(
      Animated.timing(sweepAnim, {
        toValue: 360,
        duration: 3000,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [scanning]);

  const getDevicePulseAnim = (deviceId) => {
    if (!pulseAnims[deviceId]) {
      pulseAnims[deviceId] = new Animated.Value(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnims[deviceId], {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnims[deviceId], {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
    return pulseAnims[deviceId];
  };

  const positionDevice = (device) => {
    // Verdier i verdenskoordinater (kompassvinkel)
    const useTriangulated =
      device.triangulatedAngle != null && device.triangulatedDistance != null;
    const baseAngleDeg = useTriangulated
      ? device.triangulatedAngle
      : deviceAngleFromId(device.id);
    const rawDistance = useTriangulated
      ? device.triangulatedDistance
      : device.distance;
    if (rawDistance == null || rawDistance <= 0) {
      return null;
    }
    // Hvis vi har zoomet så langt inn at enheten er utenfor range, vises den ikke.
    if (rawDistance > rangeMax) {
      return null;
    }
    const safeDistance = Math.min(rawDistance, rangeMax);
    const radius = (safeDistance / rangeMax) * maxR;

    // Skjermvinkel tar hensyn til hvordan brukeren holder telefonen (heading)
    const displayAngleDeg = ((baseAngleDeg - heading) % 360 + 360) % 360;
    const angleRad = ((displayAngleDeg - 90) * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(angleRad),
      y: centerY + radius * Math.sin(angleRad),
      angleDeg: baseAngleDeg,
      displayAngleDeg,
      radius,
      isTriangulated: useTriangulated,
    };
  };

  const sweepRotation = sweepAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const handleResponderMove = (e) => {
    const touches = e.nativeEvent.touches;
    if (!touches || touches.length < 2) {
      return;
    }
    const [t1, t2] = touches;
    const dx = t1.pageX - t2.pageX;
    const dy = t1.pageY - t2.pageY;
    const dist = Math.hypot(dx, dy);

    if (!pinchBaseDistanceRef.current) {
      pinchBaseDistanceRef.current = dist;
      return;
    }

    const start = pinchBaseDistanceRef.current;
    if (start <= 0) {
      pinchBaseDistanceRef.current = dist;
      return;
    }

    const scale = dist / start;
    const threshold = 0.12;

    if (scale > 1 + threshold) {
      // Klyp ut -> zoom inn (mindre range)
      setRangeIndex((i) => Math.max(0, i - 1));
      pinchBaseDistanceRef.current = dist;
    } else if (scale < 1 - threshold) {
      // Klyp inn -> zoom ut (større range)
      setRangeIndex((i) => Math.min(RANGE_STEPS.length - 1, i + 1));
      pinchBaseDistanceRef.current = dist;
    }
  };

  const resetPinch = () => {
    pinchBaseDistanceRef.current = null;
  };

  return (
    <View style={[styles.container, { width: radarSize, height: radarSize }]}>
      {/* Himmelretninger – fast på skjermen */}
      <View style={styles.cardinals}>
        <Text style={[styles.cardinal, styles.cardinalN]}>N</Text>
        <Text style={[styles.cardinal, styles.cardinalE]}>Ø</Text>
        <Text style={[styles.cardinal, styles.cardinalS]}>S</Text>
        <Text style={[styles.cardinal, styles.cardinalW]}>V</Text>
      </View>

      {/* Radarinhold + pinch-zoom */}
      <View
        style={[
          styles.radarContent,
          {
            width: radarSize,
            height: radarSize,
          },
        ]}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderMove={handleResponderMove}
        onResponderRelease={resetPinch}
        onResponderTerminate={resetPinch}
      >
        <Svg width={radarSize} height={radarSize} style={styles.svg}>
          <Defs>
            <RadialGradient id="radarBg" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#0a0a12" stopOpacity="1" />
              <Stop offset="70%" stopColor="#050508" stopOpacity="1" />
              <Stop offset="100%" stopColor={colors.bg} stopOpacity="1" />
            </RadialGradient>
          </Defs>

          <Circle
            cx={centerX}
            cy={centerY}
            r={radarSize / 2}
            fill="url(#radarBg)"
          />

          {[0.25, 0.5, 0.75, 1].map((scale, i) => (
            <Circle
              key={i}
              cx={centerX}
              cy={centerY}
              r={maxR * scale}
              stroke={colors.neonCyan}
              strokeWidth={i === 3 ? 1.5 : 1}
              fill="none"
              opacity={0.2 + (1 - scale) * 0.2}
            />
          ))}

          <Line
            x1={centerX}
            y1={centerY - maxR}
            x2={centerX}
            y2={centerY + maxR}
            stroke={colors.neonCyan}
            strokeWidth="1"
            opacity={0.15}
          />
          <Line
            x1={centerX - maxR}
            y1={centerY}
            x2={centerX + maxR}
            y2={centerY}
            stroke={colors.neonCyan}
            strokeWidth="1"
            opacity={0.15}
          />

          <Circle
            cx={centerX}
            cy={centerY}
            r={10}
            fill={colors.neonCyan}
            opacity={0.9}
          />
          <Circle
            cx={centerX}
            cy={centerY}
            r={14}
            fill="none"
            stroke={colors.neonCyan}
            strokeWidth={2}
            opacity={0.4}
          />

          {devices.map((device) => {
            const pos = positionDevice(device);
            if (!pos) return null;
            const confidence = device.confidence ?? 1;
            const dotColor = pos.isTriangulated ? colors.neonMagenta : colors.neonGreen;
            return (
              <G key={device.id}>
                <Circle
                  cx={pos.x}
                  cy={pos.y}
                  r={8}
                  fill={dotColor}
                  opacity={0.95 * confidence}
                />
                <Circle
                  cx={pos.x}
                  cy={pos.y}
                  r={14}
                  fill="none"
                  stroke={dotColor}
                  strokeWidth={2}
                  opacity={0.5 * confidence}
                />
              </G>
            );
          })}
        </Svg>

        {scanning && (
          <Animated.View
            style={[
              styles.sweepWrap,
              {
                width: radarSize,
                height: radarSize,
                transform: [{ rotate: sweepRotation }],
              },
            ]}
            pointerEvents="none"
          >
            <View
              style={[
                styles.sweepLine,
                {
                  left: centerX - 2,
                  top: 0,
                  width: 4,
                  height: centerY,
                },
              ]}
            />
          </Animated.View>
        )}

        {devices.map((device) => {
          const pos = positionDevice(device);
          if (!pos) return null;
          const confidence = device.confidence ?? 1;
          const pulseAnim = getDevicePulseAnim(device.id);
          const scale = pulseAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 2.2],
          });
          const opacity = pulseAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.5, 0],
          });
          return (
            <Animated.View
              key={`pulse-${device.id}`}
              style={[
                styles.pulse,
                {
                  left: pos.x - 18,
                  top: pos.y - 18,
                  borderColor: pos.isTriangulated
                    ? colors.neonMagenta
                    : colors.neonGreen,
                  transform: [{ scale }],
                  opacity,
                  opacity: Animated.multiply(opacity, confidence),
                },
              ]}
            />
          );
        })}

        {/* Merkelapper: navn, avstand, retning */}
        {devices.map((device) => {
          const pos = positionDevice(device);
          if (!pos) return null;
          const confidence = device.confidence ?? 1;
          const worldAngle = pos.angleDeg;
          const displayAngle = pos.displayAngleDeg;
          const cardinal = angleToCardinal(worldAngle);
          const labelOffset = 22;
          const radiusTag = pos.radius + labelOffset;
          const angleRad = ((displayAngle - 90) * Math.PI) / 180;
          const tx = centerX + radiusTag * Math.cos(angleRad);
          const ty = centerY + radiusTag * Math.sin(angleRad);
          return (
            <View
              key={`tag-${device.id}`}
              style={[
                styles.tag,
                {
                  left: tx - 56,
                  top: ty - 20,
                  opacity: confidence,
                },
              ]}
              pointerEvents="none"
            >
              <Text style={styles.tagName} numberOfLines={1}>
                {device.name || 'Ukjent'}
              </Text>
              <View style={styles.tagRow}>
                <Text style={styles.tagDistance}>
                  {formatDistance(
                    device.triangulatedDistance ?? device.distance
                  )}
                </Text>
                <Text
                  style={[
                    styles.tagDir,
                    pos.isTriangulated && styles.tagDirTriangulated,
                  ]}
                >
                  {cardinal}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Zoom-kontroller */}
      <View style={styles.zoomControls}>
        <Text style={styles.rangeLabel}>
          0–{rangeMax < 1 ? `${(rangeMax * 100).toFixed(0)} cm` : `${rangeMax.toFixed(1)} m`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cardinals: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  cardinal: {
    position: 'absolute',
    fontSize: 14,
    fontWeight: '800',
    color: colors.neonCyan,
    opacity: 0.9,
  },
  cardinalN: {
    top: 8,
    left: '50%',
    marginLeft: -8,
  },
  cardinalS: {
    bottom: 8,
    left: '50%',
    marginLeft: -8,
  },
  cardinalE: {
    right: 8,
    top: '50%',
    marginTop: -8,
  },
  cardinalW: {
    left: 8,
    top: '50%',
    marginTop: -8,
  },
  radarContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomControls: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(5, 5, 12, 0.9)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  rangeLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginRight: 4,
  },
  svg: {
    position: 'absolute',
  },
  sweepWrap: {
    position: 'absolute',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  sweepLine: {
    position: 'absolute',
    backgroundColor: colors.neonCyan,
    borderRadius: 2,
    opacity: 0.85,
    shadowColor: colors.neonCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
  pulse: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.neonGreen,
  },
  tag: {
    position: 'absolute',
    minWidth: 80,
    maxWidth: 112,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(10, 10, 18, 0.95)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  tagName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  tagDistance: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neonGreen,
  },
  tagDir: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neonCyan,
  },
  tagDirTriangulated: {
    color: colors.neonMagenta,
  },
});

export default RadarScreen;
