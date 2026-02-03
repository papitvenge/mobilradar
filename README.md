# MobilRadar

App som bruker Bluetooth til å oppdage nærliggende enheter og vise dem på en radar-skjerm.

## Expo-kompatibilitet

- **Expo SDK:** 54
- **React:** 19.1.0 | **React Native:** 0.81.5
- Avhengigheter er satt i tråd med `npx expo-doctor` og `npx expo install --check`.

### Native moduler

| Modul | Expo Go | Development build |
|-------|---------|--------------------|
| **react-native-ble-manager** | ❌ Ikke inkludert | ✅ Ved `expo run:ios` / `expo run:android` eller EAS Build |
| **CellModule** (Java) | ❌ Brukes ikke i Expo Go | ⚠️ Krever egen integrasjon i `android/` etter `expo prebuild` |

I Expo Go (QR-kode) kjører appen i demo-modus uten BLE. For ekte Bluetooth-skanning: bygg med `npx expo run:ios` eller EAS Build.

### Kommandoer

```bash
npm install          # bruker legacy-peer-deps via .npmrc (Node 20)
npx expo start       # start Metro, skann QR for Expo Go
npx expo run:ios     # bygg og kjør på iOS-simulator (full BLE)
npm run ios:device   # bygg og kjør på din iPhone (full BLE)
npx expo-doctor      # sjekk kompatibilitet
```

### Kjør på iPhone (fysisk enhet)

1. **Koble iPhone til Mac** med USB-kabel.
2. **Tillit:** På iPhone, velg «Tillit» hvis du får spørsmål om datamaskinen.
3. **Utviklerkonto:** Du trenger Apple ID (gratis) – første gang kan Xcode be om innlogging.
4. I prosjektmappen, i **vanlig terminal** (ikke non-interactive):
   ```bash
   npm run ios:device
   ```
5. Velg **din iPhone** når du får spørsmål om enhet.
6. Første gang kan Xcode be om å sette **Signing & Capabilities** (Team = din Apple ID). Åpne `ios/MobilRadar.xcworkspace` i Xcode om nødvendig.
7. Appen bygges og installeres på telefonen. Godta **Bluetooth**- og **plassering**-tilgang når iOS spør.
8. Trykk **Start Scan** i appen for å skanne etter BLE-enheter.

### Bygget stopper på «Planning build»

Hvis `npm run ios:device` stopper ved «Planning build» uten å starte Xcode-bygget (kjent med Expo + fysisk enhet):

1. **Bygg og kjør fra Xcode (anbefalt)**  
   - Kjør `npm run ios:open` (eller `open ios/MobilRadar.xcworkspace`).  
   - I Xcode: velg **Sølve's iPhone** (eller din enhet) som destination.  
   - **Product → Build** (⌘B), deretter **Product → Run** (⌘R).  
   Metro må kjøre: i en egen terminal, `npm start` eller `npx expo start`.

2. **Test på simulator først**  
   - `npm run ios:simulator` (eller `npx expo run:ios` uten `--device`).  
   - Hvis det fungerer der, er problemet knyttet til bygg mot fysisk enhet (f.eks. devicectl-meldingen).

3. **Rent prebuild** (ved vedvarende native-feil):  
   - `npx expo prebuild --clean`  
   - Deretter prøv `npm run ios:device` eller bygg fra Xcode som over.

4. **Sjekk at Xcode-bygget fungerer** (full logg i terminal):  
   - `npm run ios:build:device` – bygger uten å kjøre Expo CLI. Hvis dette fullfører uten feil, er problemet i Expo sin «Planning build»-steg; bruk da Xcode for å kjøre på enhet (punkt 1).

### Node-versjon

Prosjektet er satt opp for **Node 20.x** (LTS), som er den versjonen Expo SDK 54 er testet mot.

Med `nvm`:

```bash
nvm install 20
nvm use 20
```

Deretter i prosjektet:

```bash
npm install
npm run ios:device
```