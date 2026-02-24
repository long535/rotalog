package com.worklog.app.activities;

import android.app.KeyguardManager;
import android.content.Context;
import android.content.pm.ActivityInfo;
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

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class AlarmActivity extends AppCompatActivity {
    private static final String TAG = "AlarmActivity";
    private Vibrator vibrator;
    private Handler handler;
    private Runnable vibrationRunnable;
    private TextView timeText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        setupWindowFlags();
        
        setContentView(R.layout.activity_alarm);

        String title = getIntent().getStringExtra("title");
        String body = getIntent().getStringExtra("body");
        int alarmId = getIntent().getIntExtra("alarmId", 0);

        Log.d(TAG, "AlarmActivity created: id=" + alarmId + ", title=" + title);

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

        dismissBtn.setOnClickListener(v -> dismissAlarm());
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

    private void stopVibration() {
        if (vibrator != null) {
            vibrator.cancel();
        }
        if (handler != null && vibrationRunnable != null) {
            handler.removeCallbacks(vibrationRunnable);
        }
    }

    private void dismissAlarm() {
        Log.d(TAG, "Alarm dismissed");
        stopVibration();
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
        if (handler != null) {
            handler.removeCallbacksAndMessages(null);
        }
    }

    @Override
    protected void onUserLeaveHint() {
        // Prevent home button from minimizing
    }
}
