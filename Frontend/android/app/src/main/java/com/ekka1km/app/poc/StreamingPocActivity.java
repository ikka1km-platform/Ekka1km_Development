package com.ekka1km.app.poc;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.method.HideReturnsTransformationMethod;
import android.text.method.PasswordTransformationMethod;
import android.view.SurfaceHolder;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.content.res.Configuration;
import android.view.Surface;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.ekka1km.app.R;
import com.pedro.common.ConnectChecker;
import com.pedro.library.rtmp.RtmpCamera2;
import com.pedro.library.view.OpenGlView;
import com.pedro.encoder.utils.gl.AspectRatioMode;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Isolated Standalone Proof of Concept for Android Live Streaming.
 * Uses RootEncoder 2.8.1 with Hardware MediaCodec H.264 & AAC over RTMPS.
 * Features bounded automatic reconnect with exponential backoff & network awareness.
 */
public class StreamingPocActivity extends AppCompatActivity implements ConnectChecker, SurfaceHolder.Callback {

    private static final int PERMISSIONS_REQUEST_CODE = 1001;
    private static final String[] REQUIRED_PERMISSIONS = new String[]{
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO
    };

    // Bounded retry parameters
    private static final int MAX_RETRY_COUNT = 6;
    private static final long[] RETRY_DELAYS_MS = new long[]{ 2000L, 3000L, 5000L, 8000L, 10000L, 10000L };

    private OpenGlView openGlView;
    private TextView tvStreamState;
    private TextView tvDiagnostics;
    private TextView tvLogs;
    private EditText etEndpointUrl;
    private EditText etStreamKey;
    private Button btnToggleKeyVisibility;
    private Button btnSwitchCamera;
    private Button btnStartStop;
    private Button btnToggleMic;

    private RtmpCamera2 rtmpCamera2;
    private boolean isKeyVisible = false;
    private boolean isMicMuted = false;
    private Handler statsHandler = new Handler(Looper.getMainLooper());
    private Runnable statsRunnable;
    private SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm:ss", Locale.US);

    // Reconnection & Network tracking
    private int currentRetryAttempt = 0;
    private boolean isReconnecting = false;
    private boolean isUserStopping = false;
    private boolean isNetworkAvailable = true;
    private boolean waitingForNetwork = false;
    private String lastStreamUrl = "";
    private Handler retryHandler = new Handler(Looper.getMainLooper());
    private Runnable pendingRetryRunnable = null;

    private ConnectivityManager connectivityManager;
    private ConnectivityManager.NetworkCallback networkCallback;

    // Stream settings: 720p @ 30fps, 2500 kbps, AAC 128 kbps
    private static final int VIDEO_WIDTH = 1280;
    private static final int VIDEO_HEIGHT = 720;
    private static final int VIDEO_FPS = 30;
    private static final int VIDEO_BITRATE = 2500 * 1024; // 2.5 Mbps
    private static final int VIDEO_I_FRAME_INTERVAL = 2; // 2 seconds

    private static final int AUDIO_BITRATE = 128 * 1024; // 128 kbps
    private static final int AUDIO_SAMPLE_RATE = 44100;
    private static final boolean AUDIO_IS_STEREO = true;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(R.layout.activity_streaming_poc);

        initViews();
        setupListeners();
        setupNetworkMonitoring();

        openGlView.setAspectRatioMode(AspectRatioMode.Adjust);
        rtmpCamera2 = new RtmpCamera2(openGlView, this);
        openGlView.getHolder().addCallback(this);

        // Configure RootEncoder retry pool
        rtmpCamera2.getStreamClient().setReTries(MAX_RETRY_COUNT);

        appendLog("RootEncoder 2.8.1 RtmpCamera2 initialized (Max retries: " + MAX_RETRY_COUNT + ").");

        if (!hasPermissions()) {
            ActivityCompat.requestPermissions(this, REQUIRED_PERMISSIONS, PERMISSIONS_REQUEST_CODE);
        }

        startDiagnosticsTimer();
    }

    private void initViews() {
        openGlView = findViewById(R.id.openGlView);
        tvStreamState = findViewById(R.id.tvStreamState);
        tvDiagnostics = findViewById(R.id.tvDiagnostics);
        tvLogs = findViewById(R.id.tvLogs);
        etEndpointUrl = findViewById(R.id.etEndpointUrl);
        etStreamKey = findViewById(R.id.etStreamKey);
        btnToggleKeyVisibility = findViewById(R.id.btnToggleKeyVisibility);
        btnSwitchCamera = findViewById(R.id.btnSwitchCamera);
        btnStartStop = findViewById(R.id.btnStartStop);
        btnToggleMic = findViewById(R.id.btnToggleMic);
    }

    private void setupListeners() {
        btnToggleKeyVisibility.setOnClickListener(v -> {
            isKeyVisible = !isKeyVisible;
            if (isKeyVisible) {
                etStreamKey.setTransformationMethod(HideReturnsTransformationMethod.getInstance());
                btnToggleKeyVisibility.setText("HIDE");
            } else {
                etStreamKey.setTransformationMethod(PasswordTransformationMethod.getInstance());
                btnToggleKeyVisibility.setText("SHOW");
            }
            etStreamKey.setSelection(etStreamKey.getText().length());
        });

        btnSwitchCamera.setOnClickListener(v -> {
            if (rtmpCamera2 != null && rtmpCamera2.isOnPreview()) {
                try {
                    rtmpCamera2.switchCamera();
                    updatePreviewOrientation();
                    appendLog("Camera switched.");
                } catch (Exception e) {
                    appendLog("Error switching camera: " + e.getMessage());
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
                    appendLog("Microphone muted.");
                } else {
                    rtmpCamera2.enableAudio();
                    btnToggleMic.setText("MIC ON");
                    btnToggleMic.setBackgroundColor(0xFF2563EB); // Blue
                    appendLog("Microphone unmuted.");
                }
            }
        });

        btnStartStop.setOnClickListener(v -> handleStartStopStream());
    }

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
                            appendLog("Network route available.");
                            if (isReconnecting && waitingForNetwork && !isUserStopping) {
                                waitingForNetwork = false;
                                appendLog("Network restored. Triggering prompt recovery in 1.5s...");
                                cancelPendingRetry();
                                pendingRetryRunnable = () -> {
                                    if (isReconnecting && !isUserStopping && rtmpCamera2 != null) {
                                        rtmpCamera2.getStreamClient().reTry(500L, "Network route restored");
                                    }
                                };
                                retryHandler.postDelayed(pendingRetryRunnable, 1500L);
                            }
                        });
                    }

                    @Override
                    public void onLost(@NonNull Network network) {
                        isNetworkAvailable = false;
                        runOnUiThread(() -> appendLog("Network interface lost."));
                    }
                };

                connectivityManager.registerNetworkCallback(request, networkCallback);
            }
        } catch (Exception e) {
            appendLog("Network monitoring setup notice: " + e.getMessage());
        }
    }

    private void handleStartStopStream() {
        if (rtmpCamera2 == null) return;

        if (rtmpCamera2.isStreaming() || isReconnecting) {
            // User requested to stop or cancel ongoing reconnect
            appendLog("Stream stop requested by user.");
            isUserStopping = true;
            isReconnecting = false;
            waitingForNetwork = false;
            currentRetryAttempt = 0;
            cancelPendingRetry();

            rtmpCamera2.stopStream();
            updateStreamState("STOPPED", 0xFF94A3B8);
            btnStartStop.setText("START LIVE STREAM");
            btnStartStop.setBackgroundColor(0xFFDC2626);
            btnStartStop.setEnabled(true);
        } else {
            // Start stream
            boolean videoReady = rtmpCamera2.prepareVideo(VIDEO_WIDTH, VIDEO_HEIGHT, VIDEO_FPS, VIDEO_BITRATE, VIDEO_I_FRAME_INTERVAL);
            boolean audioReady = rtmpCamera2.prepareAudio(AUDIO_BITRATE, AUDIO_SAMPLE_RATE, AUDIO_IS_STEREO, false, false);

            if (!videoReady) {
                appendLog("Error: Failed to prepare video encoder (720p30 2500k).");
                Toast.makeText(this, "Video encoder preparation failed", Toast.LENGTH_SHORT).show();
                return;
            }
            if (!audioReady) {
                appendLog("Error: Failed to prepare audio encoder (AAC 128k).");
                Toast.makeText(this, "Audio encoder preparation failed", Toast.LENGTH_SHORT).show();
                return;
            }

            String endpoint = etEndpointUrl.getText().toString().trim();
            String streamKey = etStreamKey.getText().toString().trim();

            if (streamKey.isEmpty()) {
                Toast.makeText(this, "Please enter a stream key", Toast.LENGTH_SHORT).show();
                appendLog("Cannot start: Stream key is empty.");
                return;
            }

            if (!endpoint.endsWith("/")) {
                endpoint += "/";
            }

            lastStreamUrl = endpoint + streamKey;
            isUserStopping = false;
            currentRetryAttempt = 0;
            isReconnecting = false;
            waitingForNetwork = false;

            // Reset RootEncoder internal retry count before new stream
            rtmpCamera2.getStreamClient().setReTries(MAX_RETRY_COUNT);

            updateStreamState("CONNECTING...", 0xFFF59E0B);
            appendLog("Starting stream to endpoint (key redacted)...");
            rtmpCamera2.startStream(lastStreamUrl);

            btnStartStop.setText("CANCEL");
            btnStartStop.setBackgroundColor(0xFF64748B);
            btnStartStop.setEnabled(true);
        }
    }

    private void cancelPendingRetry() {
        if (pendingRetryRunnable != null) {
            retryHandler.removeCallbacks(pendingRetryRunnable);
            pendingRetryRunnable = null;
        }
    }

    private void startDiagnosticsTimer() {
        statsRunnable = new Runnable() {
            @Override
            public void run() {
                if (rtmpCamera2 != null && rtmpCamera2.isStreaming()) {
                    long bitrate = rtmpCamera2.getBitrate() / 1000; // kbps
                    tvDiagnostics.setText(String.format(Locale.US, "720p30 | %d kbps", bitrate));
                } else if (isReconnecting) {
                    tvDiagnostics.setText(String.format(Locale.US, "RECONNECTING (%d/%d)", currentRetryAttempt, MAX_RETRY_COUNT));
                } else {
                    tvDiagnostics.setText("720p30 | IDLE");
                }
                statsHandler.postDelayed(this, 1000);
            }
        };
        statsHandler.post(statsRunnable);
    }

    private void updateStreamState(String state, int color) {
        runOnUiThread(() -> {
            tvStreamState.setText("STATUS: " + state);
            tvStreamState.setTextColor(color);
        });
    }

    private void appendLog(String message) {
        runOnUiThread(() -> {
            String timestamp = timeFormat.format(new Date());
            String line = "[" + timestamp + "] " + message;
            tvLogs.setText(line);
        });
    }

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
                appendLog("Permissions granted. Initializing preview.");
                startCameraPreview();
            } else {
                appendLog("Error: Camera and Audio permissions denied.");
                Toast.makeText(this, "Camera and Audio permissions are required", Toast.LENGTH_LONG).show();
            }
        }
    }

    private void startCameraPreview() {
        if (rtmpCamera2 != null && !rtmpCamera2.isOnPreview() && hasPermissions()) {
            try {
                rtmpCamera2.startPreview(VIDEO_WIDTH, VIDEO_HEIGHT);
                updatePreviewOrientation();
                appendLog("Camera preview started (720p).");
            } catch (Exception e) {
                appendLog("Error starting preview: " + e.getMessage());
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
            appendLog("Preview orientation set to " + orientation + "°.");
        }
    }

    @Override
    public void surfaceCreated(@NonNull SurfaceHolder holder) {
        appendLog("Surface created.");
    }

    @Override
    public void surfaceChanged(@NonNull SurfaceHolder holder, int format, int width, int height) {
        appendLog("Surface changed: " + width + "x" + height);
        startCameraPreview();
        updatePreviewOrientation();
    }

    @Override
    public void surfaceDestroyed(@NonNull SurfaceHolder holder) {
        if (rtmpCamera2 != null && rtmpCamera2.isOnPreview()) {
            rtmpCamera2.stopPreview();
            appendLog("Preview stopped on surface destroyed.");
        }
    }

    // --- ConnectChecker Callbacks ---

    @Override
    public void onConnectionStarted(@NonNull String url) {
        appendLog("Connection initiated to server.");
    }

    @Override
    public void onConnectionSuccess() {
        runOnUiThread(() -> {
            // Reset retry counters on successful connection
            currentRetryAttempt = 0;
            isReconnecting = false;
            waitingForNetwork = false;
            isUserStopping = false;
            cancelPendingRetry();

            // Re-arm RootEncoder retry budget for future network drops
            if (rtmpCamera2 != null) {
                rtmpCamera2.getStreamClient().setReTries(MAX_RETRY_COUNT);
            }

            updateStreamState("STREAMING LIVE", 0xFF00FF66);
            btnStartStop.setText("STOP LIVE STREAM");
            btnStartStop.setBackgroundColor(0xFF047857); // Dark Green
            btnStartStop.setEnabled(true);
            appendLog("Connected successfully to YouTube Live! Streaming active.");
            Toast.makeText(StreamingPocActivity.this, "Live Stream Connected!", Toast.LENGTH_SHORT).show();
        });
    }

    @Override
    public void onConnectionFailed(@NonNull String reason) {
        runOnUiThread(() -> {
            if (isUserStopping) {
                appendLog("Stream stopped by user.");
                return;
            }

            if (currentRetryAttempt < MAX_RETRY_COUNT) {
                isReconnecting = true;
                long delayMs = RETRY_DELAYS_MS[Math.min(currentRetryAttempt, RETRY_DELAYS_MS.length - 1)];
                currentRetryAttempt++;
                final int displayAttempt = currentRetryAttempt;

                updateStreamState("RECONNECTING (" + displayAttempt + "/" + MAX_RETRY_COUNT + ")...", 0xFFF59E0B);
                btnStartStop.setText("CANCEL RECONNECT");
                btnStartStop.setBackgroundColor(0xFFDC2626);
                btnStartStop.setEnabled(true);

                if (!isNetworkAvailable) {
                    waitingForNetwork = true;
                    appendLog("No network (" + reason + "). Waiting for network before retry " + displayAttempt + "/" + MAX_RETRY_COUNT + "...");
                } else {
                    appendLog("Connection lost (" + reason + "). Reconnecting (" + displayAttempt + "/" + MAX_RETRY_COUNT + ") in " + (delayMs / 1000) + "s...");
                    
                    // Attempt RootEncoder native reTry first
                    boolean reTryAccepted = false;
                    if (rtmpCamera2 != null) {
                        reTryAccepted = rtmpCamera2.getStreamClient().reTry(delayMs, reason);
                    }

                    if (!reTryAccepted) {
                        // Fallback handler if RootEncoder internal shouldRetry returned false
                        appendLog("RootEncoder native reTry unavailable. Scheduling reconnect via handler in " + (delayMs / 1000) + "s...");
                        cancelPendingRetry();
                        pendingRetryRunnable = () -> {
                            if (isReconnecting && !isUserStopping && rtmpCamera2 != null) {
                                rtmpCamera2.getStreamClient().setReTries(MAX_RETRY_COUNT - displayAttempt);
                                rtmpCamera2.startStream(lastStreamUrl);
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
                btnStartStop.setText("START LIVE STREAM");
                btnStartStop.setBackgroundColor(0xFFDC2626);
                btnStartStop.setEnabled(true);
                appendLog("All " + MAX_RETRY_COUNT + " reconnect attempts failed. Stream stopped.");
                Toast.makeText(StreamingPocActivity.this, "Stream connection lost. Max retries exceeded.", Toast.LENGTH_LONG).show();
            }
        });
    }

    @Override
    public void onDisconnect() {
        runOnUiThread(() -> {
            if (isReconnecting) {
                appendLog("Socket disconnected during recovery. Reconnection in progress...");
            } else if (!isUserStopping) {
                updateStreamState("DISCONNECTED", 0xFF94A3B8);
                btnStartStop.setText("START LIVE STREAM");
                btnStartStop.setBackgroundColor(0xFFDC2626);
                btnStartStop.setEnabled(true);
                appendLog("Disconnected from server.");
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
            btnStartStop.setText("START LIVE STREAM");
            btnStartStop.setBackgroundColor(0xFFDC2626);
            btnStartStop.setEnabled(true);
            appendLog("Authentication error on RTMP endpoint (Invalid stream key).");
            if (rtmpCamera2 != null && rtmpCamera2.isStreaming()) {
                rtmpCamera2.stopStream();
            }
        });
    }

    @Override
    public void onAuthSuccess() {
        appendLog("RTMP Authentication successful.");
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (rtmpCamera2 != null && rtmpCamera2.isStreaming()) {
            appendLog("App paused: Stopping stream.");
            isUserStopping = true;
            isReconnecting = false;
            cancelPendingRetry();
            rtmpCamera2.stopStream();
        }
        if (rtmpCamera2 != null && rtmpCamera2.isOnPreview()) {
            rtmpCamera2.stopPreview();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        cancelPendingRetry();
        if (statsHandler != null && statsRunnable != null) {
            statsHandler.removeCallbacks(statsRunnable);
        }
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
    }
}
