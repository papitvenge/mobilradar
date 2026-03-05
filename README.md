# NorScan

NorScan er et nytt prosjekt for presis skanning av produkter og objekter.

## Produktmål

- Native opplevelse på Apple-enheter med LiDAR.
- Fotoskanning på andre plattformer.
- Høy nøyaktighet via kontrollmålinger fra bruker.
- Automatisk visning av målsatte tekniske tegninger i 2D og 3D.
- Eksport av modeller i egnet format for CAD og 3D-print.

## MVP (nåværende status)

Prosjektet inneholder en første MVP-skjerm med:

1. Valg av skannemotor basert på plattform (LiDAR på iOS, foto ellers).
2. Skanneflyt for objekt.
3. Registrering av kontrollmål (`faktisk mm` vs `skannet mm`).
4. Kalibrering med beregnet skaleringsfaktor.
5. Målsatt 2D/3D-visning basert på kalibrerte mål.
6. Eksportvalg (STL, OBJ, STEP, DXF).

> Merk: Selve LiDAR/fotogrammetri-motoren er foreløpig simulert i MVP for å etablere produktflyt og datamodell.

## Teknisk stack

- Expo SDK 54
- React Native 0.81
- React 19
- Expo Router

## Kom i gang

```bash
npm install
npx expo start
```

For iOS native build:

```bash
npx expo run:ios
```

## Videre roadmap

1. Integrere ekte LiDAR pipeline (ARKit/RoomPlan) for iOS.
2. Integrere fotogrammetri-pipeline for Android/web.
3. Generere mer avanserte 2D-tegninger med målsetting og toleranser.
4. Eksportere full geometri til STL/OBJ/STEP med metadata.
5. Sky-synk, versjonering og samarbeid.