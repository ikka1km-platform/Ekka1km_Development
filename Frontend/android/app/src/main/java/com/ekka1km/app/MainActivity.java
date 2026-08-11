package com.ekka1km.app;

import com.getcapacitor.BridgeActivity;
import com.ekka1km.app.EkkaNativeLocationPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(EkkaNativeLocationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
