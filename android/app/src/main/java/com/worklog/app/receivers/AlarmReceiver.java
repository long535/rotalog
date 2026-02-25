package com.worklog.app.receivers;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.worklog.app.R;
import com.worklog.app.activities.AlarmActivity;
import com.worklog.app.MainActivity;

public class AlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AlarmReceiver";
    private static final String CHANNEL_ID = "worklog_alarms";
    private static final int NOTIFICATION_ID = 1001;

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "onReceive called with action: " + intent.getAction());
        
        int alarmId = 0;
        try {
            alarmId = intent.getIntExtra("alarmId", 0);
            if (alarmId == 0) {
                android.net.Uri data = intent.getData();
                if (data != null) {
                    String idStr = data.getSchemeSpecificPart();
                    Log.d(TAG, "Got alarmId from URI: " + idStr);
                    try {
                        alarmId = Integer.parseInt(idStr);
                    } catch (NumberFormatException e) {
                        Log.e(TAG, "Failed to parse ID from URI: " + e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting alarmId: " + e.getMessage());
        }
        
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");
        String shiftId = intent.getStringExtra("shiftId");

        if (title == null || title.isEmpty()) {
            title = "提醒";
        }
        if (body == null || body.isEmpty()) {
            body = "時間到了！";
        }

        Log.d(TAG, "Alarm triggered: id=" + alarmId + ", title=" + title + ", body=" + body);

        // Vibrate
        vibrate(context);

        // Show notification first (more reliable)
        showNotification(context, alarmId, title, body);

        // Try to launch fullscreen activity
        try {
            Intent alarmIntent = new Intent(context, AlarmActivity.class);
            alarmIntent.putExtra("alarmId", alarmId);
            alarmIntent.putExtra("title", title);
            alarmIntent.putExtra("body", body);
            alarmIntent.putExtra("shiftId", shiftId);
            alarmIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            alarmIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            alarmIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
            
            context.startActivity(alarmIntent);
            Log.d(TAG, "AlarmActivity started");
        } catch (Exception e) {
            Log.e(TAG, "Failed to start AlarmActivity: " + e.getMessage());
        }
    }

    private void showNotification(Context context, int alarmId, String title, String body) {
        try {
            NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            
            // Create notification channel
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "上班提醒",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("鬧鐘提醒通知");
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 500, 500, 200, 500, 200, 500});
                channel.setSound(android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_ALARM), null);
                notificationManager.createNotificationChannel(channel);
            }

            // Create intent to open app
            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent openAppPendingIntent = PendingIntent.getActivity(
                context, 0, openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            // Build ongoing notification that won't stop
            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_popup_reminder)
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setAutoCancel(true)
                .setContentIntent(openAppPendingIntent)
                .setVibrate(new long[]{0, 500, 200, 500, 200, 500, 500, 200, 500, 200, 500})
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)  // Keep notification showing
                .setOnlyAlertOnce(false)  // Alert every time
                .setDefaults(NotificationCompat.DEFAULT_ALL);

            // Play sound
            android.net.Uri alarmSound = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_ALARM);
            if (alarmSound != null) {
                builder.setSound(alarmSound);
            }

            // Fullscreen intent for lock screen
            Intent fullscreenIntent = new Intent(context, AlarmActivity.class);
            fullscreenIntent.putExtra("alarmId", alarmId);
            fullscreenIntent.putExtra("title", title);
            fullscreenIntent.putExtra("body", body);
            fullscreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent fullscreenPendingIntent = PendingIntent.getActivity(
                context, 1, fullscreenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            builder.setFullScreenIntent(fullscreenPendingIntent, true);

            notificationManager.notify(NOTIFICATION_ID, builder.build());
            Log.d(TAG, "Ongoing notification shown");
        } catch (Exception e) {
            Log.e(TAG, "Failed to show notification: " + e.getMessage());
        }
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
