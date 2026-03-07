package com.worklog.app.activities;

import android.app.AlarmManager;
import android.app.KeyguardManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.Ringtone;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.worklog.app.R;
import com.worklog.app.receivers.AlarmReceiver;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class AlarmActivity extends AppCompatActivity {
    private static final String TAG = "AlarmActivity";
    private Vibrator vibrator;
    private Handler handler;
    private Runnable vibrationRunnable;
    private TextView timeText;
    private Ringtone ringtone;
    private int alarmId = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        try {
            setupWindowFlags();
        } catch (Exception e) {
            Log.e(TAG, "Error setting up window flags: " + e.getMessage());
        }
        
        try {
            setContentView(R.layout.activity_alarm);
        } catch (Exception e) {
            Log.e(TAG, "Error setting content view: " + e.getMessage());
            finish();
            return;
        }

        String title = "提醒";
        String body = "時間到了！";
        
        try {
            title = getIntent().getStringExtra("title");
            body = getIntent().getStringExtra("body");
            this.alarmId = getIntent().getIntExtra("alarmId", 0);
        } catch (Exception e) {
            Log.e(TAG, "Error getting intent extras: " + e.getMessage());
        }

        Log.d(TAG, "AlarmActivity created: id=" + alarmId + ", title=" + title);

        try {
            TextView titleText = findViewById(R.id.alarmTitle);
            TextView bodyText = findViewById(R.id.alarmBody);
            timeText = findViewById(R.id.alarmTime);
            Button dismissBtn = findViewById(R.id.dismissBtn);

            if (title != null) {
                titleText.setText(title);
            }
            if (body != null) {
                bodyText.setText(body);
            }

            updateTime();
            startClockUpdate();

            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            startVibration();
            startAlarmSound();

            dismissBtn.setOnClickListener(v -> dismissAlarm());
        } catch (Exception e) {
            Log.e(TAG, "Error initializing views: " + e.getMessage());
        }
    }

    private void setupWindowFlags() {
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager keyguardManager = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (keyguardManager != null) {
                keyguardManager.requestDismissKeyguard(this, null);
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            getWindow().getInsetsController().hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
            getWindow().getInsetsController().setSystemBarsBehavior(
                android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            );
        }

        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
    }

    private void updateTime() {
        SimpleDateFormat sdf = new SimpleDateFormat("HH:mm", Locale.getDefault());
        timeText.setText(sdf.format(new Date()));
    }

    private void startClockUpdate() {
        handler = new Handler(Looper.getMainLooper());
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                updateTime();
                handler.postDelayed(this, 1000);
            }
        }, 1000);
    }

    private void startVibration() {
        if (vibrator == null || !vibrator.hasVibrator()) {
            return;
        }

        final long[] pattern = {0, 1000, 500};
        
        vibrationRunnable = new Runnable() {
            @Override
            public void run() {
                if (vibrator != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
                    } else {
                        vibrator.vibrate(pattern, 0);
                    }
                }
            }
        };
        
        handler.post(vibrationRunnable);
    }

    private void startAlarmSound() {
        try {
            Uri alarmSound = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_ALARM);
            if (alarmSound != null) {
                ringtone = android.media.RingtoneManager.getRingtone(this, alarmSound);
                if (ringtone != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                        ringtone.setLooping(true);
                    }
                    AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build();
                    ringtone.setAudioAttributes(audioAttributes);
                    ringtone.play();
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to play alarm sound: " + e.getMessage());
        }
    }

    private void stopAlarmSound() {
        Log.d(TAG, "stopAlarmSound called");
        
        // Stop local ringtone first
        try {
            if (ringtone != null) {
                if (ringtone.isPlaying()) {
                    ringtone.stop();
                    Log.d(TAG, "Ringtone stopped");
                }
                ringtone = null;
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop alarm sound: " + e.getMessage());
        }
        
        // Stop alarm stream at system level
        try {
            AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                // Stop any playing alarm
                audioManager.setStreamVolume(AudioManager.STREAM_ALARM, 0, 0);
                audioManager.setStreamMute(AudioManager.STREAM_ALARM, true);
                new Handler().postDelayed(() -> {
                    try {
                        audioManager.setStreamMute(AudioManager.STREAM_ALARM, false);
                    } catch (Exception e) {}
                }, 200);
                Log.d(TAG, "Audio manager stream muted");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error muting audio: " + e.getMessage());
        }
    }

    private void stopVibration() {
        Log.d(TAG, "stopVibration called");
        if (handler != null && vibrationRunnable != null) {
            try {
                handler.removeCallbacks(vibrationRunnable);
                Log.d(TAG, "Vibration callbacks removed");
            } catch (Exception e) {
                Log.e(TAG, "Error removing callbacks: " + e.getMessage());
            }
        }
        if (vibrator != null) {
            try {
                vibrator.cancel();
                Log.d(TAG, "Vibrator cancelled");
            } catch (Exception e) {
                Log.e(TAG, "Error cancelling vibrator: " + e.getMessage());
            }
        }
    }

    private void dismissAlarm() {
        Log.d(TAG, "Alarm dismissed, alarmId=" + alarmId);
        
        // Cancel the notification FIRST (this stops notification sound/vibration)
        try {
            android.app.NotificationManager notificationManager = 
                (android.app.NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            notificationManager.cancel(1001);
            Log.d(TAG, "Notification cancelled");
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling notification: " + e.getMessage());
        }
        
        // Stop local vibration and sound
        stopVibration();
        stopAlarmSound();
        
        // Cancel the specific alarm
        if (alarmId > 0) {
            try {
                AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
                Intent intent = new Intent("com.worklog.app.ALARM_ACTION");
                intent.setClass(this, AlarmReceiver.class);
                intent.putExtra("alarmId", alarmId);
                intent.setData(android.net.Uri.parse("alarm:" + alarmId));
                
                int requestCode = 1001;
                PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    this,
                    requestCode,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );
                
                alarmManager.cancel(pendingIntent);
                pendingIntent.cancel();
                Log.d(TAG, "Cancelled alarm: " + alarmId);
            } catch (Exception e) {
                Log.e(TAG, "Error cancelling alarm: " + e.getMessage());
            }
        }
        
        // Set flag in SharedPreferences for frontend to check
        try {
            android.content.SharedPreferences prefs = getSharedPreferences("worklog_prefs", Context.MODE_PRIVATE);
            prefs.edit().putBoolean("alarmDismissed", true).apply();
            Log.d(TAG, "Set alarmDismissed flag in SharedPreferences");
        } catch (Exception e) {
            Log.e(TAG, "Error setting alarmDismissed flag: " + e.getMessage());
        }
        
        // Send broadcast to notify MainActivity
        try {
            Intent broadcastIntent = new Intent("com.worklog.app.ALARM_DISMISSED");
            broadcastIntent.putExtra("alarmId", alarmId);
            sendBroadcast(broadcastIntent);
            Log.d(TAG, "Sent ALARM_DISMISSED broadcast");
        } catch (Exception e) {
            Log.e(TAG, "Error sending broadcast: " + e.getMessage());
        }
        
        finish();
    }

    @Override
    public void onBackPressed() {
        // Disable back button - user must press dismiss
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        stopVibration();
        stopAlarmSound();
        if (handler != null) {
            handler.removeCallbacksAndMessages(null);
        }
    }

    @Override
    protected void onUserLeaveHint() {
        // Prevent home button from minimizing
    }
}
