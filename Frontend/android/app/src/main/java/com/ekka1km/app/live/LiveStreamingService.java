package com.ekka1km.app.live;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.ekka1km.app.R;

/**
 * Foreground service that keeps the live broadcast active
 * when the app is backgrounded, screen locked, or during user navigation.
 * Complies with Android 14+ (targetSdk 34+) foreground service types (camera|microphone).
 */
public class LiveStreamingService extends Service {

    public static final String CHANNEL_ID = "ekka_live_streaming";
    public static final String CHANNEL_NAME = "Ekka1km Live Streaming";
    public static final int NOTIFICATION_ID = 2001;

    public static final String ACTION_START_SERVICE = "com.ekka1km.app.action.START_STREAMING";
    public static final String ACTION_STOP_SERVICE = "com.ekka1km.app.action.STOP_STREAMING";
    public static final String EXTRA_CHANNEL_TITLE = "extra_channel_title";
    public static final String EXTRA_STREAM_TITLE = "extra_stream_title";

    private final IBinder binder = new LocalBinder();
    private boolean isRunning = false;

    public class LocalBinder extends Binder {
        public LiveStreamingService getService() {
            return LiveStreamingService.this;
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_STOP_SERVICE.equals(action)) {
                stopStreamingService();
                return START_NOT_STICKY;
            }
        }

        String channelTitle = intent != null ? intent.getStringExtra(EXTRA_CHANNEL_TITLE) : null;
        String streamTitle = intent != null ? intent.getStringExtra(EXTRA_STREAM_TITLE) : null;

        startStreamingForeground(channelTitle, streamTitle);
        return START_STICKY;
    }

    private void startStreamingForeground(String channelTitle, String streamTitle) {
        if (isRunning) return;

        Intent notificationIntent = new Intent(this, LiveBroadcasterActivity.class);
        notificationIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        int pendingIntentFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingIntentFlags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                notificationIntent,
                pendingIntentFlags
        );

        String title = "Ekka1km is Live";
        String content = (channelTitle != null && !channelTitle.isEmpty())
                ? channelTitle + " is broadcasting live"
                : "Broadcasting live stream to YouTube";

        if (streamTitle != null && !streamTitle.isEmpty()) {
            content = streamTitle;
        }

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(content)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setContentIntent(pendingIntent)
                .build();

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                int serviceType = ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA
                        | ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE;
                startForeground(NOTIFICATION_ID, notification, serviceType);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
            isRunning = true;
        } catch (Exception e) {
            // Fallback for Android versions or permission anomalies
            startForeground(NOTIFICATION_ID, notification);
            isRunning = true;
        }
    }

    public void stopStreamingService() {
        if (!isRunning) return;
        isRunning = false;
        try {
            stopForeground(true);
        } catch (Exception ignored) {}
        stopSelf();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        stopStreamingService();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Ongoing notification while broadcasting live");
            channel.setShowBadge(false);

            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    public static void start(Context context, String channelTitle, String streamTitle) {
        Intent intent = new Intent(context, LiveStreamingService.class);
        intent.setAction(ACTION_START_SERVICE);
        intent.putExtra(EXTRA_CHANNEL_TITLE, channelTitle);
        intent.putExtra(EXTRA_STREAM_TITLE, streamTitle);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }

    public static void stop(Context context) {
        Intent intent = new Intent(context, LiveStreamingService.class);
        intent.setAction(ACTION_STOP_SERVICE);
        context.startService(intent);
    }
}

