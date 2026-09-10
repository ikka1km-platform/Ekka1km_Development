package com.ekka1km.app.live;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Capacitor Plugin that bridges the web frontend to the production
 * native Android LiveBroadcasterActivity.
 */
@CapacitorPlugin(
    name = "EkkaLiveBroadcaster",
    permissions = {
        @Permission(
            alias = "camera",
            strings = { Manifest.permission.CAMERA }
        ),
        @Permission(
            alias = "microphone",
            strings = { Manifest.permission.RECORD_AUDIO }
        )
    }
)
public class EkkaLiveBroadcasterPlugin extends Plugin {

    @PluginMethod
    public void checkMediaPermissions(PluginCall call) {
        try {
            Context context = getContext();
            boolean cameraGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
            boolean micGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;

            JSObject result = new JSObject();
            result.put("camera", cameraGranted ? "granted" : "prompt");
            result.put("microphone", micGranted ? "granted" : "prompt");
            result.put("allGranted", cameraGranted && micGranted);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to check media permissions: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void requestMediaPermissions(PluginCall call) {
        try {
            Context context = getContext();
            boolean cameraGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
            boolean micGranted = ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;

            if (cameraGranted && micGranted) {
                checkMediaPermissions(call);
                return;
            }

            requestPermissionForAliases(new String[]{"camera", "microphone"}, call, "onMediaPermissionsResult");
        } catch (Exception e) {
            call.reject("Failed to request media permissions: " + e.getMessage(), e);
        }
    }

    @PermissionCallback
    private void onMediaPermissionsResult(PluginCall call) {
        checkMediaPermissions(call);
    }

    @PluginMethod
    public void launchBroadcaster(PluginCall call) {
        try {
            Context context = getContext();

            String apiUrl = call.getString("apiUrl", "");
            String sessionToken = call.getString("sessionToken", "");
            String channelId = call.getString("channelId", "");
            String channelTitle = call.getString("channelTitle", "Ekka1Km LiveNews");
            String title = call.getString("title", "Live Broadcast");
            String description = call.getString("description", "");
            Double latitude = call.getDouble("latitude", 0.0);
            Double longitude = call.getDouble("longitude", 0.0);

            if (sessionToken == null || sessionToken.isEmpty()) {
                call.reject("Missing authenticated session token", "UNAUTHENTICATED");
                return;
            }

            if (channelId == null || channelId.isEmpty()) {
                call.reject("Missing authorized channelId", "MISSING_CHANNEL");
                return;
            }

            if (title == null || title.trim().isEmpty()) {
                call.reject("Live title is required", "MISSING_TITLE");
                return;
            }

            Intent intent = new Intent(context, LiveBroadcasterActivity.class);
            intent.putExtra(LiveBroadcasterActivity.EXTRA_API_URL, apiUrl);
            intent.putExtra(LiveBroadcasterActivity.EXTRA_SESSION_TOKEN, sessionToken);
            intent.putExtra(LiveBroadcasterActivity.EXTRA_CHANNEL_ID, channelId);
            intent.putExtra(LiveBroadcasterActivity.EXTRA_CHANNEL_TITLE, channelTitle);
            intent.putExtra(LiveBroadcasterActivity.EXTRA_TITLE, title);
            intent.putExtra(LiveBroadcasterActivity.EXTRA_DESCRIPTION, description);
            intent.putExtra(LiveBroadcasterActivity.EXTRA_LATITUDE, latitude != null ? latitude : 0.0);
            intent.putExtra(LiveBroadcasterActivity.EXTRA_LONGITUDE, longitude != null ? longitude : 0.0);

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);

            JSObject result = new JSObject();
            result.put("launched", true);
            result.put("channelId", channelId);
            result.put("title", title);
            call.resolve(result);

        } catch (Exception e) {
            call.reject("Failed to launch live broadcaster: " + e.getMessage(), e);
        }
    }
}

