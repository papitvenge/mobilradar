package com.mobilradar;

import android.content.Context;
import android.telephony.TelephonyManager;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class CellModule extends ReactContextBaseJavaModule {
    private TelephonyManager telephonyManager;

    public CellModule(ReactApplicationContext reactContext) {
        super(reactContext);
        telephonyManager = (TelephonyManager) reactContext.getSystemService(Context.TELEPHONY_SERVICE);
    }

    @Override
    public String getName() {
        return "CellModule";
    }

    @ReactMethod
    public void getCellInfo(Promise promise) {
        try {
            promise.resolve(telephonyManager.getAllCellInfo().toString());
        } catch (Exception e) {
            promise.reject("ERROR", e);
        }
    }
}
