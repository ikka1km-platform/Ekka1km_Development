package com.ekka1km.app;

import com.getcapacitor.BridgeActivity;
import com.ekka1km.app.EkkaNativeLocationPlugin;
import com.ekka1km.app.live.EkkaLiveBroadcasterPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(EkkaNativeLocationPlugin.class);
        registerPlugin(EkkaLiveBroadcasterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
