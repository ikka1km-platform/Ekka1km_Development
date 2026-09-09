package com.ekka1km.app.live;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Surface;
import android.view.SurfaceHolder;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.ekka1km.app.R;
import com.pedro.common.ConnectChecker;
import com.pedro.encoder.utils.gl.AspectRatioMode;
import com.pedro.library.rtmp.RtmpCamera2;
import com.pedro.library.view.OpenGlView;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Production-grade Android Live Broadcaster Activity.
 * Reuses RootEncoder 2.8.1 with Hardware MediaCodec H.264 & AAC over RTMPS.
 * Integrates foreground service, bounded reconnect, and ephemeral RAM-only stream credentials.
 * Preview orientation logic preserved per product lock.
 */
public class LiveBroadcasterActivity extends AppCompatActivity implements ConnectChecker, SurfaceHolder.Callback {

    private static final int PERMISSIONS_REQUEST_CODE = 1002;
    private static final String[] REQUIRED_PERMISSIONS = new String[]{
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO
    };

    // Bounded retry parameters
    private static final int MAX_RETRY_COUNT = 6;
    private static final long[] RETRY_DELAYS_MS = new long[]{ 2000L, 3000L, 5000L, 8000L, 10000L, 10000L };

    // Stream settings: 720p @ 30fps, 2500 kbps, AAC 128 kbps
    private static final int VIDEO_WIDTH = 1280;
    private static final int VIDEO_HEIGHT = 720;
    private static final int VIDEO_FPS = 30;
    private static final int VIDEO_BITRATE = 2500 * 1024; // 2.5 Mbps
    private static final int VIDEO_I_FRAME_INTERVAL = 2; // 2 seconds

    private static final int AUDIO_BITRATE = 128 * 1024; // 128 kbps
    private static final int AUDIO_SAMPLE_RATE = 44100;
    private static final boolean AUDIO_IS_STEREO = true;

    // Intent Extra keys
    public static final String EXTRA_API_URL = "extra_api_url";
    public static final String EXTRA_SESSION_TOKEN = "extra_session_token";
    public static final String EXTRA_CHANNEL_ID = "extra_channel_id";
    public static final String EXTRA_CHANNEL_TITLE = "extra_channel_title";
    public static final String EXTRA_TITLE = "extra_title";
    public static final String EXTRA_DESCRIPTION = "extra_description";
    public static final String EXTRA_LATITUDE = "extra_latitude";
    public static final String EXTRA_LONGITUDE = "extra_longitude";

    // Views
    private OpenGlView openGlView;
    private TextView tvChannelTitle;
    private TextView tvStreamState;
    private TextView tvDuration;
    private TextView tvDiagnostics;
    private TextView tvStatusDetail;

    private LinearLayout cardPreBroadcast;
    private TextView tvBroadcastTitle;
    private TextView tvGpsInfo;
    private Button btnStartLive;
    private Button btnCancelPreBroadcast;

    private Button btnSwitchCamera;
    private Button btnToggleMic;
    private Button btnEndLive;

    // Streaming engine
    private RtmpCamera2 rtmpCamera2;
    private boolean isMicMuted = false;
    private final ExecutorService networkExecutor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    // Session parameters (passed from web app / login)
    private String apiUrl = "";
    private String sessionToken = "";
    private String channelId = "";
    private String channelTitle = "";
    private String broadcastTitle = "";
    private String broadcastDescription = "";
    private double latitude = 0.0;
    private double longitude = 0.0;

    // Ephemeral runtime session credentials (RAM ONLY, NEVER PERSISTED)
    private String activeLiveSessionId = null;
    private String ephemeralIngestionUrl = null;
    private String ephemeralStreamKey = null;

    // State tracking
    private boolean isPrepared = false;
    private boolean isBroadcasting = false;
    private boolean isUserStopping = false;
    private boolean isReconnecting = false;
    private boolean isNetworkAvailable = true;
    private boolean waitingForNetwork = false;
    private int currentRetryAttempt = 0;

    private Handler retryHandler = new Handler(Looper.getMainLooper());
    private Runnable pendingRetryRunnable = null;

    private ConnectivityManager connectivityManager;
    private ConnectivityManager.NetworkCallback networkCallback;

    // Duration timer
    private long liveStartTimeMs = 0L;
    private Handler timerHandler = new Handler(Looper.getMainLooper());
    private Runnable timerRunnable;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(R.layout.activity_live_broadcaster);

        parseIntentExtras();
        initViews();
        setupListeners();
        setupNetworkMonitoring();

        openGlView.setAspectRatioMode(AspectRatioMode.Adjust);
        rtmpCamera2 = new RtmpCamera2(openGlView, this);
        openGlView.getHolder().addCallback(this);

        rtmpCamera2.getStreamClient().setReTries(MAX_RETRY_COUNT);

        if (!hasPermissions()) {
            ActivityCompat.requestPermissions(this, REQUIRED_PERMISSIONS, PERMISSIONS_REQUEST_CODE);
        }

        startDiagnosticsTimer();
        prepareLiveSessionOnBackend();
    }

    private void parseIntentExtras() {
        Intent intent = getIntent();
        if (intent != null) {
            apiUrl = intent.getStringExtra(EXTRA_API_URL);
            sessionToken = intent.getStringExtra(EXTRA_SESSION_TOKEN);
            channelId = intent.getStringExtra(EXTRA_CHANNEL_ID);
            channelTitle = intent.getStringExtra(EXTRA_CHANNEL_TITLE);
            broadcastTitle = intent.getStringExtra(EXTRA_TITLE);
            broadcastDescription = intent.getStringExtra(EXTRA_DESCRIPTION);
            latitude = intent.getDoubleExtra(EXTRA_LATITUDE, 0.0);
            longitude = intent.getDoubleExtra(EXTRA_LONGITUDE, 0.0);
        }

        if (channelTitle == null || channelTitle.isEmpty()) {
            channelTitle = "Ekka1Km LiveNews";
        }
        if (broadcastTitle == null || broadcastTitle.isEmpty()) {
            broadcastTitle = "Live Broadcast";
        }
    }

    private void initViews() {
        openGlView = findViewById(R.id.openGlView);
        tvChannelTitle = findViewById(R.id.tvChannelTitle);
        tvStreamState = findViewById(R.id.tvStreamState);
        tvDuration = findViewById(R.id.tvDuration);
        tvDiagnostics = findViewById(R.id.tvDiagnostics);
        tvStatusDetail = findViewById(R.id.tvStatusDetail);

        cardPreBroadcast = findViewById(R.id.cardPreBroadcast);
        tvBroadcastTitle = findViewById(R.id.tvBroadcastTitle);
        tvGpsInfo = findViewById(R.id.tvGpsInfo);
        btnStartLive = findViewById(R.id.btnStartLive);
        btnCancelPreBroadcast = findViewById(R.id.btnCancelPreBroadcast);

        btnSwitchCamera = findViewById(R.id.btnSwitchCamera);
        btnToggleMic = findViewById(R.id.btnToggleMic);
        btnEndLive = findViewById(R.id.btnEndLive);

        tvChannelTitle.setText(channelTitle);
        tvBroadcastTitle.setText(broadcastTitle);
        tvGpsInfo.setText(String.format(Locale.US, "GPS: %.4f, %.4f (Authoritative)", latitude, longitude));

        btnStartLive.setEnabled(false);
        btnStartLive.setText("PREPARING SESSION...");
        btnEndLive.setEnabled(false);
    }

    private void setupListeners() {
        btnStartLive.setOnClickListener(v -> handleStartStream());

        btnCancelPreBroadcast.setOnClickListener(v -> {
            cleanupEphemeralCredentials();
            finish();
        });

        btnSwitchCamera.setOnClickListener(v -> {
            if (rtmpCamera2 != null && rtmpCamera2.isOnPreview()) {
                try {
                    rtmpCamera2.switchCamera();
                    updatePreviewOrientation();
                } catch (Exception e) {
                    Toast.makeText(this, "Camera switch error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                }
            }
        });

        btnToggleMic.setOnClickListener(v -> {
            if (rtmpCamera2 != null) {
                isMicMuted = !isMicMuted;
                if (isMicMuted) {
                    rtmpCamera2.disableAudio();
                    btnToggleMic.setText("MIC MUTED");
                    btnToggleMic.setBackgroundColor(0xFFDC2626); // Red
                } else {
                    rtmpCamera2.enableAudio();
                    btnToggleMic.setText("MIC ON");
                    btnToggleMic.setBackgroundColor(0xFF2563EB); // Blue
                }
            }
        });

        btnEndLive.setOnClickListener(v -> confirmEndLive());
    }

    /**
     * Backend Stage 4 preparation call:
     * Dispatches startlivesession over HTTPS.
     * Receives ephemeral ingestion address and stream key in volatile memory only.
     */
    private void prepareLiveSessionOnBackend() {
        if (apiUrl == null || apiUrl.isEmpty() || sessionToken == null || sessionToken.isEmpty()) {
            showErrorDialog("Session Error", "Missing API endpoint or authentication token.");
            return;
        }

        networkExecutor.execute(() -> {
            try {
                String encodedAction = URLEncoder.encode("startlivesession", "UTF-8");
                String encodedSession = URLEncoder.encode(sessionToken, "UTF-8");
                String encodedChannelId = URLEncoder.encode(channelId != null ? channelId : "", "UTF-8");
                String encodedTitle = URLEncoder.encode(broadcastTitle, "UTF-8");
                String encodedDesc = URLEncoder.encode(broadcastDescription != null ? broadcastDescription : "", "UTF-8");
                String encodedLat = URLEncoder.encode(String.valueOf(latitude), "UTF-8");
                String encodedLng = URLEncoder.encode(String.valueOf(longitude), "UTF-8");

                String requestUrl = apiUrl + "?action=" + encodedAction
                        + "&session=" + encodedSession
                        + "&channelId=" + encodedChannelId
                        + "&title=" + encodedTitle
                        + "&description=" + encodedDesc
                        + "&latitude=" + encodedLat
                        + "&longitude=" + encodedLng;

                HttpURLConnection conn = (HttpURLConnection) new URL(requestUrl).openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(15000);

                int responseCode = conn.getResponseCode();
                BufferedReader reader = new BufferedReader(new InputStreamReader(
                        responseCode >= 200 && responseCode < 300 ? conn.getInputStream() : conn.getErrorStream()
                ));
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }
                reader.close();

                JSONObject json = new JSONObject(response.toString());
                boolean success = json.optBoolean("success", false);

                if (success && json.has("data")) {
                    JSONObject data = json.getJSONObject("data");
                    activeLiveSessionId = data.getString("liveSessionId");
                    ephemeralIngestionUrl = data.getString("rtmpsIngestionUrl");
                    ephemeralStreamKey = data.getString("streamKey"); // Ephemeral: volatile RAM only

                    mainHandler.post(() -> {
                        isPrepared = true;
                        btnStartLive.setEnabled(true);
                        btnStartLive.setText("START LIVE STREAM");
                        btnStartLive.setBackgroundColor(0xFF059669); // Green
                        tvStreamState.setText("READY");
                        tvStreamState.setBackgroundColor(0xFF059669);
                    });
                } else {
                    String msg = json.optString("message", "Preparation failed");
                    mainHandler.post(() -> showErrorDialog("Live Setup Failed", msg));
                }

            } catch (Exception e) {
                mainHandler.post(() -> showErrorDialog("Network Error", "Unable to prepare live stream session: " + e.getMessage()));
            }
        });
    }

    private void handleStartStream() {
        if (!isPrepared || ephemeralStreamKey == null || ephemeralIngestionUrl == null) {
            Toast.makeText(this, "Session not ready yet", Toast.LENGTH_SHORT).show();
            return;
        }

        boolean videoReady = rtmpCamera2.prepareVideo(VIDEO_WIDTH, VIDEO_HEIGHT, VIDEO_FPS, VIDEO_BITRATE, VIDEO_I_FRAME_INTERVAL);
        boolean audioReady = rtmpCamera2.prepareAudio(AUDIO_BITRATE, AUDIO_SAMPLE_RATE, AUDIO_IS_STEREO, false, false);

        if (!videoReady || !audioReady) {
            Toast.makeText(this, "Hardware encoder preparation failed", Toast.LENGTH_SHORT).show();
            return;
        }

        String endpoint = ephemeralIngestionUrl.trim();
        if (!endpoint.endsWith("/")) {
            endpoint += "/";
        }
        String fullStreamUrl = endpoint + ephemeralStreamKey;

        isUserStopping = false;
        currentRetryAttempt = 0;
        isReconnecting = false;
        waitingForNetwork = false;

        rtmpCamera2.getStreamClient().setReTries(MAX_RETRY_COUNT);

        updateStreamState("CONNECTING...", 0xFFF59E0B);
        btnStartLive.setEnabled(false);

        // Start Android foreground service with notification
        LiveStreamingService.start(this, channelTitle, broadcastTitle);

        // Begin streaming directly to YouTube
        rtmpCamera2.startStream(fullStreamUrl);
    }

    private void confirmEndLive() {
        new AlertDialog.Builder(this)
                .setTitle("End Live Stream")
                .setMessage("Are you sure you want to end this live broadcast? YouTube will conclude the recording.")
                .setPositiveButton("End Live", (dialog, which) -> executeEndLive("Broadcaster ended"))
                .setNegativeButton("Keep Streaming", null)
                .show();
    }

    private void executeEndLive(String reason) {
        isUserStopping = true;
        isBroadcasting = false;
        isReconnecting = false;
        waitingForNetwork = false;
        cancelPendingRetry();

        if (rtmpCamera2 != null && rtmpCamera2.isStreaming()) {
            rtmpCamera2.stopStream();
        }

        LiveStreamingService.stop(this);
        stopDurationTimer();

        updateStreamState("ENDING...", 0xFF94A3B8);

        // Call backend endlivesession
        if (activeLiveSessionId != null && apiUrl != null && sessionToken != null) {
            final String sessId = activeLiveSessionId;
            networkExecutor.execute(() -> {
                try {
                    String encodedAction = URLEncoder.encode("endlivesession", "UTF-8");
                    String encodedSession = URLEncoder.encode(sessionToken, "UTF-8");
                    String encodedSessId = URLEncoder.encode(sessId, "UTF-8");
                    String encodedReason = URLEncoder.encode(reason, "UTF-8");

                    String requestUrl = apiUrl + "?action=" + encodedAction
                            + "&session=" + encodedSession
                            + "&liveSessionId=" + encodedSessId
                            + "&terminationReason=" + encodedReason;

                    HttpURLConnection conn = (HttpURLConnection) new URL(requestUrl).openConnection();
                    conn.setRequestMethod("GET");
                    conn.setConnectTimeout(10000);
                    conn.setReadTimeout(10000);

                    BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        response.append(line);
                    }
                    reader.close();

                    JSONObject json = new JSONObject(response.toString());
                    final int durationSec = json.optJSONObject("data") != null ?
                            json.getJSONObject("data").optInt("durationSeconds", 0) : 0;

                    mainHandler.post(() -> showSessionSummaryDialog(sessId, durationSec));

                } catch (Exception e) {
                    mainHandler.post(() -> showSessionSummaryDialog(sessId, 0));
                } finally {
                    cleanupEphemeralCredentials();
                }
            });
        } else {
            cleanupEphemeralCredentials();
            finish();
        }
    }

    private void showSessionSummaryDialog(String sessId, int durationSeconds) {
        String formattedDuration = String.format(Locale.US, "%02d:%02d:%02d",
                durationSeconds / 3600,
                (durationSeconds % 3600) / 60,
                durationSeconds % 60
        );

        new AlertDialog.Builder(this)
                .setTitle("Broadcast Finalized")
                .setMessage("Your live stream has ended successfully.\n\n"
                        + "Channel: " + channelTitle + "\n"
                        + "Duration: " + formattedDuration + "\n"
                        + "Session ID: " + sessId + "\n"
                        + "Status: Ended")
                .setCancelable(false)
                .setPositiveButton("Return to Ekka1km", (dialog, which) -> finish())
                .show();
    }

    private void cleanupEphemeralCredentials() {
        activeLiveSessionId = null;
        ephemeralIngestionUrl = null;
        ephemeralStreamKey = null; // Overwrite reference in RAM
    }

    // --- ConnectChecker Callbacks ---

    @Override
    public void onConnectionStarted(@NonNull String url) {
        runOnUiThread(() -> updateStreamState("CONNECTING...", 0xFFF59E0B));
    }

    @Override
    public void onConnectionSuccess() {
        runOnUiThread(() -> {
            isBroadcasting = true;
            isReconnecting = false;
            waitingForNetwork = false;
            isUserStopping = false;
            currentRetryAttempt = 0;
            cancelPendingRetry();

            if (rtmpCamera2 != null) {
                rtmpCamera2.getStreamClient().setReTries(MAX_RETRY_COUNT);
            }

            // Hide pre-broadcast card once streaming is verified
            cardPreBroadcast.setVisibility(View.GONE);
            btnEndLive.setEnabled(true);

            updateStreamState("STREAMING LIVE", 0xFFDC2626); // Red LIVE pill
            startDurationTimer();

            Toast.makeText(LiveBroadcasterActivity.this, "Live Broadcast Active!", Toast.LENGTH_SHORT).show();

            // Trigger backend activatelivesession
            notifyBackendSessionActive();
        });
    }

    private void notifyBackendSessionActive() {
        if (activeLiveSessionId == null || apiUrl == null || sessionToken == null) return;
        final String sessId = activeLiveSessionId;

        networkExecutor.execute(() -> {
            try {
                String requestUrl = apiUrl + "?action=activatelivesession"
                        + "&session=" + URLEncoder.encode(sessionToken, "UTF-8")
                        + "&liveSessionId=" + URLEncoder.encode(sessId, "UTF-8");

                HttpURLConnection conn = (HttpURLConnection) new URL(requestUrl).openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(8000);
                conn.getResponseCode();
            } catch (Exception ignored) {}
        });
    }

    @Override
    public void onConnectionFailed(@NonNull String reason) {
        runOnUiThread(() -> {
            if (isUserStopping) return;

            if (currentRetryAttempt < MAX_RETRY_COUNT) {
                isReconnecting = true;
                long delayMs = RETRY_DELAYS_MS[Math.min(currentRetryAttempt, RETRY_DELAYS_MS.length - 1)];
                currentRetryAttempt++;
                final int displayAttempt = currentRetryAttempt;

                updateStreamState("RECONNECTING (" + displayAttempt + "/" + MAX_RETRY_COUNT + ")", 0xFFF59E0B);

                if (!isNetworkAvailable) {
                    waitingForNetwork = true;
                    tvStatusDetail.setText("Waiting for network route...");
                } else {
                    tvStatusDetail.setText("Retry in " + (delayMs / 1000) + "s...");
                    boolean reTryAccepted = false;
                    if (rtmpCamera2 != null) {
                        reTryAccepted = rtmpCamera2.getStreamClient().reTry(delayMs, reason);
                    }

                    if (!reTryAccepted) {
                        cancelPendingRetry();
                        pendingRetryRunnable = () -> {
                            if (isReconnecting && !isUserStopping && rtmpCamera2 != null && ephemeralIngestionUrl != null && ephemeralStreamKey != null) {
                                rtmpCamera2.getStreamClient().setReTries(MAX_RETRY_COUNT - displayAttempt);
                                String endpoint = ephemeralIngestionUrl.endsWith("/") ? ephemeralIngestionUrl : (ephemeralIngestionUrl + "/");
                                rtmpCamera2.startStream(endpoint + ephemeralStreamKey);
                            }
                        };
                        retryHandler.postDelayed(pendingRetryRunnable, delayMs);
                    }
                }
            } else {
                // All retries exhausted -> Stop stream cleanly without infinite loop
                isReconnecting = false;
                currentRetryAttempt = 0;
                waitingForNetwork = false;
                cancelPendingRetry();

                if (rtmpCamera2 != null && rtmpCamera2.isStreaming()) {
                    rtmpCamera2.stopStream();
                }

                updateStreamState("CONNECTION LOST", 0xFFEF4444);
                Toast.makeText(LiveBroadcasterActivity.this, "Stream connection lost. Max retries exceeded.", Toast.LENGTH_LONG).show();
                executeEndLive("Network connection lost");
            }
        });
    }

    @Override
    public void onDisconnect() {
        runOnUiThread(() -> {
            if (!isReconnecting && !isUserStopping) {
                updateStreamState("DISCONNECTED", 0xFF94A3B8);
            }
        });
    }

    @Override
    public void onAuthError() {
        runOnUiThread(() -> {
            isReconnecting = false;
            currentRetryAttempt = 0;
            cancelPendingRetry();

            updateStreamState("AUTH ERROR", 0xFFEF4444);
            Toast.makeText(LiveBroadcasterActivity.this, "RTMP authentication rejected by server", Toast.LENGTH_LONG).show();
            executeEndLive("RTMP Auth Error");
        });
    }

    @Override
    public void onAuthSuccess() {}

    private void cancelPendingRetry() {
        if (pendingRetryRunnable != null) {
            retryHandler.removeCallbacks(pendingRetryRunnable);
            pendingRetryRunnable = null;
        }
    }

    private void updateStreamState(String state, int color) {
        tvStreamState.setText(state);
        tvStreamState.setBackgroundColor(color);
    }

    private void startDurationTimer() {
        liveStartTimeMs = System.currentTimeMillis();
        timerRunnable = new Runnable() {
            @Override
            public void run() {
                if (isBroadcasting) {
                    long elapsed = Math.max(0, (System.currentTimeMillis() - liveStartTimeMs) / 1000);
                    tvDuration.setText(String.format(Locale.US, "%02d:%02d:%02d",
                            elapsed / 3600,
                            (elapsed % 3600) / 60,
                            elapsed % 60
                    ));
                    timerHandler.postDelayed(this, 1000);
                }
            }
        };
        timerHandler.post(timerRunnable);
    }

    private void stopDurationTimer() {
        if (timerHandler != null && timerRunnable != null) {
            timerHandler.removeCallbacks(timerRunnable);
        }
    }

    private void startDiagnosticsTimer() {
        mainHandler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (rtmpCamera2 != null && rtmpCamera2.isStreaming()) {
                    long bitrate = rtmpCamera2.getBitrate() / 1000;
                    tvDiagnostics.setText(String.format(Locale.US, "720p30 | %d kbps", bitrate));
                } else if (isReconnecting) {
                    tvDiagnostics.setText(String.format(Locale.US, "RECONNECTING (%d/%d)", currentRetryAttempt, MAX_RETRY_COUNT));
                } else {
                    tvDiagnostics.setText("720p30 | IDLE");
                }
                mainHandler.postDelayed(this, 1000);
            }
        }, 1000);
    }

    // --- Network Awareness ---

    private void setupNetworkMonitoring() {
        try {
            connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (connectivityManager != null) {
                NetworkRequest request = new NetworkRequest.Builder()
                        .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                        .build();

                networkCallback = new ConnectivityManager.NetworkCallback() {
                    @Override
                    public void onAvailable(@NonNull Network network) {
                        isNetworkAvailable = true;
                        runOnUiThread(() -> {
                            if (isReconnecting && waitingForNetwork && !isUserStopping) {
                                waitingForNetwork = false;
                                cancelPendingRetry();
                                pendingRetryRunnable = () -> {
                                    if (isReconnecting && !isUserStopping && rtmpCamera2 != null) {
                                        rtmpCamera2.getStreamClient().reTry(500L, "Network route restored");
                                    }
                                };
                                retryHandler.postDelayed(pendingRetryRunnable, 1200L);
                            }
                        });
                    }

                    @Override
                    public void onLost(@NonNull Network network) {
                        isNetworkAvailable = false;
                    }
                };

                connectivityManager.registerNetworkCallback(request, networkCallback);
            }
        } catch (Exception ignored) {}
    }

    // --- Camera Preview & Orientation (Deferred Logic Preserved) ---

    private boolean hasPermissions() {
        for (String permission : REQUIRED_PERMISSIONS) {
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                return false;
            }
        }
        return true;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSIONS_REQUEST_CODE) {
            if (hasPermissions()) {
                startCameraPreview();
            } else {
                Toast.makeText(this, "Camera and Microphone permissions are required", Toast.LENGTH_LONG).show();
                finish();
            }
        }
    }

    private void startCameraPreview() {
        if (rtmpCamera2 != null && !rtmpCamera2.isOnPreview() && hasPermissions()) {
            try {
                rtmpCamera2.startPreview(VIDEO_WIDTH, VIDEO_HEIGHT);
                updatePreviewOrientation();
            } catch (Exception e) {
                Toast.makeText(this, "Preview initialization error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            }
        }
    }

    @Override
    public void onConfigurationChanged(@NonNull Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        updatePreviewOrientation();
    }

    private int calculatePreviewOrientation() {
        int rotation = Surface.ROTATION_0;
        WindowManager wm = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        if (wm != null && wm.getDefaultDisplay() != null) {
            rotation = wm.getDefaultDisplay().getRotation();
        }
        switch (rotation) {
            case Surface.ROTATION_0:
                return 0;
            case Surface.ROTATION_90:
                return 90;
            case Surface.ROTATION_180:
                return 180;
            case Surface.ROTATION_270:
                return 270;
            default:
                return 0;
        }
    }

    private void updatePreviewOrientation() {
        if (rtmpCamera2 != null && rtmpCamera2.getGlInterface() != null) {
            int orientation = calculatePreviewOrientation();
            rtmpCamera2.getGlInterface().setRotation(orientation);
        }
    }

    @Override
    public void surfaceCreated(@NonNull SurfaceHolder holder) {}

    @Override
    public void surfaceChanged(@NonNull SurfaceHolder holder, int format, int width, int height) {
        startCameraPreview();
        updatePreviewOrientation();
    }

    @Override
    public void surfaceDestroyed(@NonNull SurfaceHolder holder) {
        if (rtmpCamera2 != null && rtmpCamera2.isOnPreview()) {
            rtmpCamera2.stopPreview();
        }
    }

    private void showErrorDialog(String title, String message) {
        new AlertDialog.Builder(this)
                .setTitle(title)
                .setMessage(message)
                .setPositiveButton("OK", (dialog, which) -> finish())
                .setCancelable(false)
                .show();
    }

    @Override
    public void onBackPressed() {
        if (isBroadcasting) {
            confirmEndLive();
        } else {
            cleanupEphemeralCredentials();
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        cancelPendingRetry();
        stopDurationTimer();
        if (connectivityManager != null && networkCallback != null) {
            try {
                connectivityManager.unregisterNetworkCallback(networkCallback);
            } catch (Exception ignored) {}
        }
        if (rtmpCamera2 != null) {
            if (rtmpCamera2.isStreaming()) {
                rtmpCamera2.stopStream();
            }
            if (rtmpCamera2.isOnPreview()) {
                rtmpCamera2.stopPreview();
            }
        }
        LiveStreamingService.stop(this);
        cleanupEphemeralCredentials();
    }
}

