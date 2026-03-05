# NorScan

NorScan er et nytt prosjekt for svært presis skanning av produkter og objekter.

## Mål

- Native Apple-opplevelse med LiDAR som førstevalg.
- Fotoskanning på plattformer uten LiDAR.
- Bruker kan legge inn kontrollmålinger for kalibrering og riktige mål.
- Etter skanning: visning av målsatte tekniske tegninger i 2D og 3D.
- Eksport til format som kan brukes videre i CAD, produksjon og 3D-print.

## Status i dette repoet

Dette repoet er nå startet opp som **NorScan MVP**:

- Rebrandet app- og prosjektmetadata til NorScan.
- Ny hovedskjerm med tydelig flyt:
  1. Velg skannemotor (LiDAR/foto)
  2. Legg inn kontrollmålinger
  3. Kjør skanning/prosessering
  4. Se tekniske mål
  5. Velg eksportformat
- Produktdokumentasjon og arkitekturgrunnlag under `docs/`.

## Kom i gang

```bash
npm install
npx expo start
```

Kjør på iOS:

```bash
npx expo run:ios
```

## Foreslått produktretning

Se detaljer i:

- `docs/PRD.md`
- `docs/TEKNISK_ARKITEKTUR.md`
- `docs/ROADMAP.md`