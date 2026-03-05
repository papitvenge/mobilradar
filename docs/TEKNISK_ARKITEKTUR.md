# NorScan – Teknisk arkitektur (første versjon)

## 1. Oversikt

NorScan bygges som en app med felles produktflyt og plattformspesifikke skannemotorer:

- **Motor A (Apple):** native LiDAR + depth pipeline.
- **Motor B (øvrige plattformer):** fotogrammetri fra flere bilder.

## 2. Hovedmoduler

1. **Capture Orchestrator**
   - Styrer skannestatus (idle/capturing/processing/done).
   - Koordinerer input fra valgt motor.

2. **Measurement Calibration**
   - Tar inn kontrollmålinger fra bruker.
   - Beregner skaleringsfaktor og estimert toleranse.

3. **Model Builder**
   - Lager normalisert geometri (mesh/point cloud -> modell).
   - Klargjør data for tegning og eksport.

4. **Drawing Generator**
   - 2D-oppsett med målsetting.
   - 3D-visning med måleoverlay.

5. **Export Pipeline**
   - Konverterer modell til valgte output-format.
   - Pakker metadata (enheter, toleranse, tidsstempel).

## 3. Datamodell (konsept)

- `ScanSession`
  - `id`, `createdAt`, `platform`, `scanMode`, `status`
- `ControlMeasurement`
  - `id`, `label`, `valueMm`
- `ModelDimensions`
  - `widthMm`, `heightMm`, `depthMm`, `toleranceMm`
- `ExportJob`
  - `formats[]`, `status`, `outputUris[]`

## 4. Plattformdeteksjon

- iOS-enheter med støtte: foreslå LiDAR først.
- Uten støtte: fallback til fotoskanning.
- Bruker kan overstyre valg når begge metoder er tilgjengelige.

## 5. Neste tekniske steg

1. Egen native modul for LiDAR-innsamling på iOS.
2. Fotogrammetri-pipeline for Android/web-backend.
3. Persistenslag for skanningssesjoner.
4. Verifiseringstester for kalibrering mot kontrollmål.
