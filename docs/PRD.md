# NorScan – Produktkrav (PRD)

## 1. Produktvisjon

NorScan skal gjøre det enkelt å skanne et fysisk objekt og få ut nøyaktige tekniske tegninger og 3D-filer som kan brukes i produksjon.

## 2. Primære brukerbehov

1. Skann objekt raskt med høy presisjon.
2. Verifiser/kalibrer mål med egne kontrollmålinger.
3. Se tydelig 2D- og 3D-resultat med mål.
4. Eksporter til brukbare filformater (f.eks. 3D-printer, CAD).

## 3. Plattformstrategi

- **Apple (iPhone/iPad Pro med LiDAR):** native LiDAR-skanneflyt som standard.
- **Andre plattformer:** fotoskanning (multi-view photogrammetry).

## 4. Funksjonelle krav

### 4.1 Skanning

- Bruker skal kunne starte, pause og fullføre en skanning.
- App skal vise status for innsamling og prosessering.
- App skal tydelig vise hvilken motor som brukes (LiDAR eller foto).

### 4.2 Kontrollmålinger

- Bruker skal kunne legge inn en eller flere kjente referansemål (mm).
- Kalibrering skal benytte disse målene i rekonstruksjonsskala.
- App skal indikere forventet toleranse etter kalibrering.

### 4.3 Resultatvisning

- 2D-visning med hovedmål (bredde/høyde/dybde) og toleranse.
- 3D-visning med målsetting og inspeksjon.
- Resultat skal lagres i prosjekt/scan-objekt.

### 4.4 Eksport

- Bruker skal kunne velge ett eller flere formater.
- Førsteformat i MVP: STL, OBJ, USDZ, STEP, DXF, PDF.

## 5. Ikke-funksjonelle krav

- Høy stabilitet ved lange skanninger.
- Forutsigbar ytelse på mobile enheter.
- Datagrunnlag for måling skal kunne spores/reproduseres.
- Klare personvernmeldinger ved kamera/sensorbruk.

## 6. MVP-avgrensning

- Fokus på én komplett ende-til-ende flyt i app.
- Simulert/forenklet rekonstruksjon i UI kan brukes i tidlig fase.
- Full native LiDAR-pipeline implementeres i neste fase.
