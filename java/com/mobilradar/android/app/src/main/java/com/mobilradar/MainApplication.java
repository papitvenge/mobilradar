import com.mobilradar.CellModule; // Legg til

public class MainApplication extends Application implements ReactApplication {
    ...
    @Override
    protected List<ReactPackage> getPackages() {
        return Arrays.<ReactPackage>asList(
            new MainReactPackage(),
            new ReactNativeBLEPackage(), // For BLE (hvis nødvendig)
            new ReactPackage() {
                @Override
                public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
                    return Arrays.<NativeModule>asList(
                        new CellModule(reactContext)
                    );
                }
            }
        );
    }
}
