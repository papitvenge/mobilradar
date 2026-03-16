# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

MobilRadar is an Expo (React Native) app that uses BLE and Wi-Fi to detect nearby devices and display them on a radar. On web, it runs in **demo mode** with mock devices. See `README.md` for full command reference.

### Node version

The project requires **Node 20.x** (pinned in `.nvmrc` and `package.json` engines). Run `nvm use 20` before any npm commands.

### Running the dev server (web)

```bash
npx expo start --web --port 8081
```

The app opens at `http://localhost:8081` in demo mode (no BLE/Wi-Fi on web). This is the primary way to develop and test UI in the cloud environment.

### Lint / Test / Build

- **No linter** is configured in this repo.
- **No test framework** is configured; `npm test` is a placeholder that exits with code 1.
- `npm run build` is a placeholder echo command.
- Use `npx expo-doctor` to validate Expo dependency compatibility.

### Gotchas

- `.npmrc` sets `legacy-peer-deps=true`; this is required for `npm install` to succeed.
- The `ios/` and `android/` directories are gitignored and generated via `npx expo prebuild`. They do not exist in the repo.
- BLE scanning (`react-native-ble-manager`) and Wi-Fi scanning (`react-native-wifi-reborn`) require native builds (`expo run:ios` / `expo run:android`) — they do not work in Expo Go or web.
- VR camera view requires `expo-camera` which is unavailable on web; only radar and list views work in the browser.
