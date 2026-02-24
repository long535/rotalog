package com.worklog.app.receivers;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;

import com.worklog.app.activities.AlarmActivity;

public class AlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AlarmReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        int alarmId = intent.getIntExtra("alarmId", 0);
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");
        String shiftId = intent.getStringExtra("shiftId");

        Log.d(TAG, "Alarm triggered: id=" + alarmId + ", title=" + title + ", body=" + body);

        vibrate(context);

        Intent alarmIntent = new Intent(context, AlarmActivity.class);
        alarmIntent.putExtra("alarmId", alarmId);
        alarmIntent.putExtra("title", title);
        alarmIntent.putExtra("body", body);
        alarmIntent.putExtra("shiftId", shiftId);
        alarmIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        alarmIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        context.startActivity(alarmIntent);
    }

    private void vibrate(Context context) {
        try {
            Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                long[] pattern = {0, 500, 200, 500, 200, 500};
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
                } else {
                    vibrator.vibrate(pattern, -1);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to vibrate: " + e.getMessage());
        }
    }
}
