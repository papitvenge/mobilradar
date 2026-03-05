import React, { useMemo, useState, useEffect } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, radius, spacing } from '../theme';

const APPLE_LIDAR_NOTE =
  'LiDAR-modus er prioritert på iPhone/iPad Pro med sensor. På enheter uten LiDAR brukes fotoskanning.';

const DEFAULT_MEASUREMENTS = [
  { id: '1', label: 'Bredde referansekloss', valueMm: 120 },
  { id: '2', label: 'Høyde referansekloss', valueMm: 80 },
];

const EXPORT_FORMATS = ['STL', 'OBJ', 'USDZ', 'STEP', 'DXF', 'PDF'];

function createDrawingResult(controlMeasurements) {
  const base = {
    widthMm: 357.2,
    heightMm: 218.6,
    depthMm: 140.4,
  };
  const calibrationFactor = controlMeasurements.length ? 1.0 : 1.03;
  return {
    ...base,
    widthMm: Number((base.widthMm * calibrationFactor).toFixed(1)),
    heightMm: Number((base.heightMm * calibrationFactor).toFixed(1)),
    depthMm: Number((base.depthMm * calibrationFactor).toFixed(1)),
    toleranceMm: controlMeasurements.length ? 0.8 : 2.5,
  };
}

export default function Index() {
  const isApple = Platform.OS === 'ios';
  const [scanMode, setScanMode] = useState(isApple ? 'lidar' : 'photo');
  const [scanPhase, setScanPhase] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [controlMeasurements, setControlMeasurements] = useState(DEFAULT_MEASUREMENTS);
  const [newLabel, setNewLabel] = useState('');
  const [newValueMm, setNewValueMm] = useState('');
  const [selectedFormats, setSelectedFormats] = useState(['STL', 'PDF']);

  const result = useMemo(
    () => (scanPhase === 'done' ? createDrawingResult(controlMeasurements) : null),
    [scanPhase, controlMeasurements]
  );

  useEffect(() => {
    if (scanPhase !== 'capturing' && scanPhase !== 'processing') return undefined;
    const interval = setInterval(() => {
      setProgress((old) => {
        const delta = scanPhase === 'capturing' ? 12 : 18;
        const next = Math.min(old + delta, 100);
        if (next >= 100 && scanPhase === 'capturing') {
          setScanPhase('processing');
          return 0;
        }
        if (next >= 100 && scanPhase === 'processing') {
          setScanPhase('done');
        }
        return next;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [scanPhase]);

  const statusLabel = {
    idle: 'Klar for skanning',
    capturing: 'Samler punktsky og bilder',
    processing: 'Prosesserer mesh og kalibrerer mål',
    done: 'Ferdig – tekniske tegninger er klare',
  }[scanPhase];

  const startScan = () => {
    setProgress(0);
    setScanPhase('capturing');
  };

  const resetScan = () => {
    setProgress(0);
    setScanPhase('idle');
  };

  const addControlMeasurement = () => {
    const parsed = Number(newValueMm.replace(',', '.'));
    if (!newLabel.trim() || !Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert('Ugyldig måling', 'Skriv inn navn og en verdi i mm.');
      return;
    }
    setControlMeasurements((old) => [
      ...old,
      { id: `${Date.now()}`, label: newLabel.trim(), valueMm: parsed },
    ]);
    setNewLabel('');
    setNewValueMm('');
  };

  const toggleFormat = (format) => {
    setSelectedFormats((old) =>
      old.includes(format) ? old.filter((item) => item !== format) : [...old, format]
    );
  };

  const exportSelection = () => {
    if (!selectedFormats.length) {
      Alert.alert('Ingen format valgt', 'Velg minst ett eksportformat.');
      return;
    }
    Alert.alert(
      'Eksport startet',
      `Genererer filer (${selectedFormats.join(', ')}) fra kalibrert 3D-modell.`
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>NorScan</Text>
            <Text style={styles.subtitle}>
              Presis objektskanning med LiDAR (Apple) og fotoskanning (andre plattformer)
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Skannemotor</Text>
            <Text style={styles.infoText}>
              {isApple
                ? APPLE_LIDAR_NOTE
                : 'Denne plattformen bruker fotoskanning med multi-view rekonstruksjon.'}
            </Text>
            <View style={styles.row}>
              <Pressable
                onPress={() => setScanMode('lidar')}
                style={[
                  styles.chip,
                  scanMode === 'lidar' && styles.chipSelected,
                  !isApple && styles.chipDisabled,
                ]}
                disabled={!isApple}
              >
                <Text style={styles.chipText}>LiDAR</Text>
              </Pressable>
              <Pressable
                onPress={() => setScanMode('photo')}
                style={[styles.chip, scanMode === 'photo' && styles.chipSelected]}
              >
                <Text style={styles.chipText}>Fotoskanning</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Kontrollmålinger (kalibrering)</Text>
            <Text style={styles.infoText}>
              Legg inn kjente mål for å låse målestokk og sikre riktige tekniske tegninger.
            </Text>

            <View style={styles.inputRow}>
              <TextInput
                value={newLabel}
                onChangeText={setNewLabel}
                placeholder="Målenavn"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.inputWide]}
              />
              <TextInput
                value={newValueMm}
                onChangeText={setNewValueMm}
                keyboardType="numeric"
                placeholder="mm"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
              <Pressable onPress={addControlMeasurement} style={styles.addBtn}>
                <Text style={styles.addBtnText}>Legg til</Text>
              </Pressable>
            </View>

            {controlMeasurements.map((item) => (
              <View key={item.id} style={styles.measurementRow}>
                <Text style={styles.measurementLabel}>{item.label}</Text>
                <Text style={styles.measurementValue}>{item.valueMm} mm</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Skanneprosess</Text>
            <Text style={styles.statusText}>{statusLabel}</Text>
            {(scanPhase === 'capturing' || scanPhase === 'processing') && (
              <View style={styles.progressOuter}>
                <View style={[styles.progressInner, { width: `${progress}%` }]} />
              </View>
            )}
            <View style={styles.row}>
              <Pressable
                onPress={startScan}
                style={[styles.actionBtn, (scanPhase === 'capturing' || scanPhase === 'processing') && styles.actionBtnDisabled]}
                disabled={scanPhase === 'capturing' || scanPhase === 'processing'}
              >
                <Text style={styles.actionBtnText}>Start skann</Text>
              </Pressable>
              <Pressable onPress={resetScan} style={styles.resetBtn}>
                <Text style={styles.actionBtnText}>Nullstill</Text>
              </Pressable>
            </View>
          </View>

          {result && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Resultat: tekniske tegninger</Text>
              <Text style={styles.infoText}>2D- og 3D-tegning er generert fra kalibrert modell.</Text>

              <View style={styles.measurementRow}>
                <Text style={styles.measurementLabel}>Bredde</Text>
                <Text style={styles.measurementValue}>{result.widthMm} mm</Text>
              </View>
              <View style={styles.measurementRow}>
                <Text style={styles.measurementLabel}>Høyde</Text>
                <Text style={styles.measurementValue}>{result.heightMm} mm</Text>
              </View>
              <View style={styles.measurementRow}>
                <Text style={styles.measurementLabel}>Dybde</Text>
                <Text style={styles.measurementValue}>{result.depthMm} mm</Text>
              </View>
              <View style={styles.measurementRow}>
                <Text style={styles.measurementLabel}>Estimert toleranse</Text>
                <Text style={styles.measurementValue}>± {result.toleranceMm} mm</Text>
              </View>

              <Text style={[styles.cardTitle, styles.exportTitle]}>Eksportformat</Text>
              <View style={styles.exportWrap}>
                {EXPORT_FORMATS.map((format) => (
                  <Pressable
                    key={format}
                    onPress={() => toggleFormat(format)}
                    style={[
                      styles.exportChip,
                      selectedFormats.includes(format) && styles.exportChipSelected,
                    ]}
                  >
                    <Text style={styles.exportChipText}>{format}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={exportSelection} style={styles.exportBtn}>
                <Text style={styles.actionBtnText}>Eksporter valgte filer</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  safe: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  header: {
    padding: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 17,
  },
  infoText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: 'rgba(43, 122, 252, 0.25)',
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipText: {
    color: colors.text,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  input: {
    minWidth: 72,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  inputWide: {
    flexGrow: 1,
    minWidth: 150,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addBtnText: {
    color: colors.text,
    fontWeight: '700',
  },
  measurementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
    gap: spacing.md,
  },
  measurementLabel: {
    color: colors.textMuted,
    flex: 1,
  },
  measurementValue: {
    color: colors.text,
    fontWeight: '700',
  },
  statusText: {
    color: colors.text,
    fontWeight: '600',
  },
  progressOuter: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  progressInner: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  actionBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  resetBtn: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  actionBtnText: {
    color: colors.text,
    fontWeight: '700',
  },
  exportTitle: {
    marginTop: spacing.md,
  },
  exportWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  exportChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  exportChipSelected: {
    backgroundColor: 'rgba(61, 199, 118, 0.25)',
    borderColor: colors.success,
  },
  exportChipText: {
    color: colors.text,
    fontWeight: '600',
  },
  exportBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
});
