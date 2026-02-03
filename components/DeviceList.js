import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { colors, spacing, radius } from '../theme';
import { formatDistance } from '../utils/measurements';

const DeviceCard = ({ device, index, anim }) => {
  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });
  const opacity = anim;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <View style={styles.cardInner}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(device.name || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {device.name || 'Ukjent enhet'}
          </Text>
          <Text style={styles.id} numberOfLines={1}>
            {device.id}
          </Text>
        </View>
        <View style={styles.stats}>
          <Text style={styles.distance}>
            {formatDistance(device.triangulatedDistance ?? device.distance)}
            {device.triangulatedDistance != null && (
              <Text style={styles.triangulatedHint}> · △</Text>
            )}
          </Text>
          <Text style={styles.rssi}>{device.rssi} dBm</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const defaultAnim = new Animated.Value(1);

const DeviceList = ({ devices = [] }) => {
  const animsRef = useRef([]);

  useEffect(() => {
    while (animsRef.current.length < devices.length) {
      animsRef.current.push(new Animated.Value(0));
    }
    const anims = animsRef.current;
    devices.forEach((_, i) => {
      if (anims[i] == null) return;
      anims[i].setValue(0);
      Animated.timing(anims[i], {
        toValue: 1,
        duration: 320,
        delay: i * 50,
        useNativeDriver: true,
      }).start();
    });
  }, [devices.length]);

  const anims = animsRef.current;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Enheter i nærheten</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{devices.length}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {devices.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📡</Text>
            <Text style={styles.emptyTitle}>Ingen enheter ennå</Text>
            <Text style={styles.emptySub}>
              Start skanning for å oppdage BLE-enheter rundt deg
            </Text>
          </View>
        ) : (
          devices.map((device, index) => (
            <DeviceCard
              key={device.id}
              device={device}
              index={index}
              anim={anims[index] ?? defaultAnim}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: colors.neonCyan,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: {
    color: colors.bg,
    fontSize: 13,
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
    opacity: 0.7,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: colors.textMuted,
    opacity: 0.8,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 245, 255, 0.2)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neonCyan,
  },
  info: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing.sm,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  id: {
    fontSize: 11,
    color: colors.textMuted,
  },
  stats: {
    alignItems: 'flex-end',
  },
  distance: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neonGreen,
    marginBottom: 2,
  },
  triangulatedHint: {
    fontSize: 11,
    color: colors.neonCyan,
    fontWeight: '600',
  },
  rssi: {
    fontSize: 12,
    color: colors.textMuted,
  },
});

export default DeviceList;
