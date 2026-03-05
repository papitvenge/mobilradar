import React, { useEffect, useMemo, useState } from 'react';
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
import { colors, spacing, radius } from '../theme';
import {
  applyScaleToDimensions,
  computeCalibration,
  createMockRawDimensions,
  formatMm,
} from '../utils/calibration';

const EXPORT_FORMATS = ['STL', 'OBJ', 'STEP', 'DXF'];

export default function Index() {
  const [objectName, setObjectName] = useState('Nytt objekt');
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [rawDimensions, setRawDimensions] = useState(null);
  const [viewMode, setViewMode] = useState('2D');
  const [selectedFormat, setSelectedFormat] = useState('STL');
  const [controlMeasurements, setControlMeasurements] = useState([
    { id: 'm-1', label: 'Kontrollmål 1', actualMm: '', scannedMm: '' },
  ]);
  const captureMode =
    Platform.OS === 'ios' ? 'LiDAR + foto (Apple native)' : 'Fotoskanning (multiplattform)';

  const calibration = useMemo(
    () => computeCalibration(controlMeasurements),
    [controlMeasurements]
  );
  const finalDimensions = useMemo(() => {
    if (!rawDimensions) return null;
    return applyScaleToDimensions(rawDimensions, calibration.scaleFactor);
  }, [rawDimensions, calibration.scaleFactor]);

  useEffect(() => {
    if (!scanning) return undefined;
    const timer = setInterval(() => {
      setScanProgress((prev) => {
        const next = Math.min(prev + 8, 100);
        if (next >= 100) {
          setScanning(false);
          setRawDimensions(createMockRawDimensions(objectName));
        }
        return next;
      });
    }, 350);
    return () => {
      clearInterval(timer);
    };
  }, [scanning, objectName]);

  const updateMeasurement = (id, field, value) => {
    setControlMeasurements((prev) =>
      prev.map((measurement) =>
        measurement.id === id ? { ...measurement, [field]: value } : measurement
      )
    );
  };

  const addMeasurement = () => {
    setControlMeasurements((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        label: `Kontrollmål ${prev.length + 1}`,
        actualMm: '',
        scannedMm: '',
      },
    ]);
  };

  const removeMeasurement = (id) => {
    setControlMeasurements((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((measurement) => measurement.id !== id);
    });
  };

  const startScan = () => {
    if (!objectName.trim()) {
      Alert.alert('Objektnavn mangler', 'Legg inn navn på objektet før du starter skanningen.');
      return;
    }
    setScanProgress(0);
    setRawDimensions(null);
    setScanning(true);
  };

  const stopScan = () => {
    setScanning(false);
  };

  const exportModel = () => {
    if (!finalDimensions) {
      Alert.alert('Ingen modell', 'Skann objektet ferdig før eksport.');
      return;
    }
    Alert.alert(
      'Eksport klar',
      `${objectName} er klargjort for ${selectedFormat}.\nMål: ${formatMm(
        finalDimensions.widthMm
      )} x ${formatMm(finalDimensions.heightMm)} x ${formatMm(finalDimensions.depthMm)}`
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>NorScan</Text>
          <Text style={styles.tagline}>
            Native LiDAR-skanning på Apple og fotoskanning på andre plattformer
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Skannemotor</Text>
          <Text style={styles.valueLabel}>{captureMode}</Text>
          <Text style={styles.hint}>
            {Platform.OS === 'ios'
              ? 'iOS-enheter med LiDAR bruker dybde + foto for høy nøyaktighet.'
              : 'Denne plattformen bruker fotogrammetri (fotoskanning).'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Objekt</Text>
          <TextInput
            style={styles.input}
            value={objectName}
            onChangeText={setObjectName}
            placeholder="F.eks. Ventilhode DN25"
            placeholderTextColor={colors.textMuted}
          />
          <View style={styles.scanControls}>
            <Pressable
              style={[styles.btn, styles.btnPrimary, scanning && styles.btnDisabled]}
              onPress={startScan}
              disabled={scanning}
            >
              <Text style={styles.btnText}>Start skanning</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnDanger, !scanning && styles.btnDisabled]}
              onPress={stopScan}
              disabled={!scanning}
            >
              <Text style={styles.btnText}>Stopp</Text>
            </Pressable>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${scanProgress}%` }]} />
          </View>
          <Text style={styles.hint}>
            {scanning ? `Skanner... ${scanProgress}%` : rawDimensions ? 'Skanning fullført.' : 'Klar'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Kontrollmålinger (kalibrering)</Text>
          {controlMeasurements.map((measurement) => (
            <View key={measurement.id} style={styles.measurementRow}>
              <Text style={styles.measurementLabel}>{measurement.label}</Text>
              <View style={styles.measurementInputs}>
                <TextInput
                  style={styles.input}
                  value={measurement.actualMm}
                  onChangeText={(value) => updateMeasurement(measurement.id, 'actualMm', value)}
                  placeholder="Faktisk mm"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                />
                <TextInput
                  style={styles.input}
                  value={measurement.scannedMm}
                  onChangeText={(value) => updateMeasurement(measurement.id, 'scannedMm', value)}
                  placeholder="Skannet mm"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <Pressable
                style={[styles.linkBtn, controlMeasurements.length <= 1 && styles.btnDisabled]}
                onPress={() => removeMeasurement(measurement.id)}
                disabled={controlMeasurements.length <= 1}
              >
                <Text style={styles.linkBtnText}>Fjern</Text>
              </Pressable>
            </View>
          ))}
          <Pressable style={[styles.btn, styles.btnSecondary]} onPress={addMeasurement}>
            <Text style={styles.btnText}>+ Legg til kontrollmål</Text>
          </Pressable>
          <Text style={styles.hint}>
            Skaleringsfaktor: {calibration.scaleFactor.toFixed(4)} ·
            {' '}
            {calibration.validCount} gyldige målinger ·
            {' '}
            {calibration.confidence}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Teknisk tegning</Text>
          <View style={styles.segment}>
            <Pressable
              style={[styles.segmentBtn, viewMode === '2D' && styles.segmentBtnActive]}
              onPress={() => setViewMode('2D')}
            >
              <Text style={styles.segmentText}>2D</Text>
            </Pressable>
            <Pressable
              style={[styles.segmentBtn, viewMode === '3D' && styles.segmentBtnActive]}
              onPress={() => setViewMode('3D')}
            >
              <Text style={styles.segmentText}>3D</Text>
            </Pressable>
          </View>
        </View>
        {!finalDimensions ? (
          <Text style={styles.hint}>Fullfør skanningen for å vise målsatte tegninger.</Text>
        ) : viewMode === '2D' ? (
          <View style={styles.drawingBox}>
            <Text style={styles.drawingTitle}>2D målskisse</Text>
            <Text style={styles.dimension}>Bredde: {formatMm(finalDimensions.widthMm)}</Text>
            <Text style={styles.dimension}>Høyde: {formatMm(finalDimensions.heightMm)}</Text>
            <Text style={styles.dimension}>Dybde: {formatMm(finalDimensions.depthMm)}</Text>
          </View>
        ) : (
          <View style={styles.drawingBox}>
            <Text style={styles.drawingTitle}>3D målmodell</Text>
            <Text style={styles.dimension}>
              Bounding Box: {formatMm(finalDimensions.widthMm)} × {formatMm(finalDimensions.heightMm)} ×{' '}
              {formatMm(finalDimensions.depthMm)}
            </Text>
            <Text style={styles.hint}>
              Klar for eksport til CAD/3D-print.
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Eksport</Text>
          <View style={styles.formatRow}>
            {EXPORT_FORMATS.map((format) => (
              <Pressable
                key={format}
                style={[styles.formatChip, selectedFormat === format && styles.formatChipActive]}
                onPress={() => setSelectedFormat(format)}
              >
                <Text style={styles.formatChipText}>{format}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={exportModel}>
            <Text style={styles.btnText}>Eksporter modell</Text>
          </Pressable>
          <Text style={styles.hint}>Målene inkluderer kontrollmålt kalibrering før eksport.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  header: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },
  tagline: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  valueLabel: {
    color: colors.neonCyan,
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  scanControls: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnPrimary: {
    backgroundColor: 'rgba(0, 245, 255, 0.14)',
    borderColor: colors.neonGreen,
  },
  btnDanger: {
    backgroundColor: 'rgba(255, 51, 102, 0.15)',
    borderColor: colors.danger,
  },
  btnSecondary: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderColor: colors.neonPurple,
    marginTop: spacing.xs,
  },
  btnText: {
    color: colors.text,
    fontWeight: '700',
  },
  progressBar: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.neonCyan,
  },
  measurementRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  measurementLabel: {
    color: colors.text,
    fontWeight: '600',
  },
  measurementInputs: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  linkBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  linkBtnText: {
    color: colors.neonMagenta,
    fontWeight: '600',
  },
  segment: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  segmentBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(0, 245, 255, 0.15)',
    borderColor: colors.neonCyan,
  },
  segmentText: {
    color: colors.text,
    fontWeight: '700',
  },
  drawingBox: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  drawingTitle: {
    color: colors.neonGreen,
    fontSize: 15,
    fontWeight: '700',
  },
  dimension: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  formatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  formatChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  formatChipActive: {
    borderColor: colors.neonPurple,
    backgroundColor: 'rgba(168, 85, 247, 0.22)',
  },
  formatChipText: {
    color: colors.text,
    fontWeight: '700',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
