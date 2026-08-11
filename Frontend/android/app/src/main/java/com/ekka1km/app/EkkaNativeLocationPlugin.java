package com.ekka1km.app;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Criteria;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

@CapacitorPlugin(
    name = "EkkaNativeLocation",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        )
    }
)
public class EkkaNativeLocationPlugin extends Plugin {

    private static final String TAG = "EkkaNativeLocation";
    private static final long LOCATION_TIMEOUT_MS = 15000;

    private LocationManager locationManager;
    private Executor executor;
    private Handler handler;
    private PluginCall pendingCall;
    private LocationListener locationListener;
    private Runnable timeoutRunnable;

    @Override
    public void load() {
        Context context = getContext();
        locationManager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        executor = Executors.newSingleThreadExecutor();
        handler = new Handler(Looper.getMainLooper());
    }

    @PluginMethod
    public void getCurrentLocation(PluginCall call) {
        if (pendingCall != null) {
            call.reject("Another location request is in progress", "LOCATION_IN_PROGRESS");
            return;
        }

        pendingCall = call;

        if (hasSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
            || hasSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)) {
            requestLocation();
        } else {
            requestPermissionForAliases(
                new String[]{"location"},
                call,
                "onLocationPermission"
            );
        }
    }

    private boolean hasSelfPermission(String permission) {
        return ContextCompat.checkSelfPermission(getContext(), permission)
            == PackageManager.PERMISSION_GRANTED;
    }

    private boolean isLocationEnabled() {
        try {
            return locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
                || locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
        } catch (Exception e) {
            return true;
        }
    }

    @PermissionCallback
    private void onLocationPermission(PluginCall call) {
        boolean fineGranted = hasSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION);
        boolean coarseGranted = hasSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION);

        if (fineGranted || coarseGranted) {
            requestLocation();
        } else {
            boolean canShowRationale = ActivityCompat.shouldShowRequestPermissionRationale(
                getActivity(),
                Manifest.permission.ACCESS_FINE_LOCATION
            );

            if (!canShowRationale) {
                call.reject(
                    "Location permission permanently denied. Please enable in settings.",
                    "PERMISSION_PERMANENTLY_DENIED"
                );
            } else {
                call.reject("Location permission denied", "PERMISSION_DENIED");
            }
            pendingCall = null;
        }
    }

    private void requestLocation() {
        if (!isLocationEnabled()) {
            if (pendingCall != null) {
                pendingCall.reject("Location services are disabled", "LOCATION_DISABLED");
                pendingCall = null;
            }
            return;
        }

        timeoutRunnable = () -> {
            if (pendingCall != null) {
                pendingCall.reject("Location request timed out", "LOCATION_TIMEOUT");
                pendingCall = null;
            }
            cleanupLocationRequest();
        };
        handler.postDelayed(timeoutRunnable, LOCATION_TIMEOUT_MS);

        locationListener = new LocationListener() {
            @Override
            public void onLocationChanged(Location location) {
                handler.post(() -> {
                    if (pendingCall != null && location != null) {
                        resolveLocation(location);
                    }
                    cleanupLocationRequest();
                });
            }

            @Override
            public void onStatusChanged(String provider, int status, android.os.Bundle extras) {}

            @Override
            public void onProviderEnabled(String provider) {}

            @Override
            public void onProviderDisabled(String provider) {
                handler.post(() -> {
                    if (pendingCall != null) {
                        pendingCall.reject("Location provider disabled", "LOCATION_DISABLED");
                        pendingCall = null;
                    }
                    cleanupLocationRequest();
                });
            }
        };

        try {
            Criteria criteria = new Criteria();
            criteria.setAccuracy(Criteria.ACCURACY_FINE);
            criteria.setPowerRequirement(Criteria.POWER_HIGH);

            String provider = locationManager.getBestProvider(criteria, true);

            if (provider == null) {
                if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                    provider = LocationManager.GPS_PROVIDER;
                } else if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                    provider = LocationManager.NETWORK_PROVIDER;
                } else {
                    if (pendingCall != null) {
                        pendingCall.reject("No location provider available", "LOCATION_UNAVAILABLE");
                        pendingCall = null;
                    }
                    cleanupLocationRequest();
                    return;
                }
            }

            locationManager.requestSingleUpdate(provider, locationListener, Looper.getMainLooper());
        } catch (SecurityException e) {
            if (pendingCall != null) {
                pendingCall.reject("Location permission not granted", "PERMISSION_DENIED");
                pendingCall = null;
            }
            cleanupLocationRequest();
        } catch (Exception e) {
            if (pendingCall != null) {
                pendingCall.reject("Failed to get location: " + e.getMessage(), "LOCATION_UNAVAILABLE");
                pendingCall = null;
            }
            cleanupLocationRequest();
        }
    }

    private void resolveLocation(Location location) {
        if (pendingCall == null) return;

        JSObject result = new JSObject();
        result.put("latitude", location.getLatitude());
        result.put("longitude", location.getLongitude());
        result.put("accuracy", location.getAccuracy());
        result.put("timestamp", location.getTime());

        if (location.hasAltitude()) {
            result.put("altitude", location.getAltitude());
        }
        if (location.hasSpeed()) {
            result.put("speed", location.getSpeed());
        }

        pendingCall.resolve(result);
        pendingCall = null;
    }

    private void cleanupLocationRequest() {
        if (locationListener != null) {
            try {
                locationManager.removeUpdates(locationListener);
            } catch (Exception e) {
                // ignore
            }
            locationListener = null;
        }
        if (timeoutRunnable != null) {
            handler.removeCallbacks(timeoutRunnable);
            timeoutRunnable = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        cleanupLocationRequest();
        pendingCall = null;
    }
}
