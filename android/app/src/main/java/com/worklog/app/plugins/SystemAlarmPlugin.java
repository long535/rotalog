package com.worklog.app.plugins;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.worklog.app.receivers.AlarmReceiver;

import org.json.JSONArray;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

@CapacitorPlugin(name = "SystemAlarm")
public class SystemAlarmPlugin extends Plugin {
    private static final String TAG = "SystemAlarmPlugin";
    private AlarmManager alarmManager;

    @Override
    public void load() {
        alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
    }

    @PluginMethod
    public void schedule(PluginCall call) {
        long idLong = call.getLong("id");
        
        // If ID is 0 or negative, generate a valid ID using timestamp
        if (idLong <= 0) {
            idLong = System.currentTimeMillis() % 1000000 + 100;
            Log.d(TAG, "Generated new alarm ID: " + idLong);
        }
        
        String triggerAt = call.getString("triggerAt");
        String title = call.getString("title", "提醒");
        String body = call.getString("body", "");
        String shiftId = call.getString("shiftId", "");

        if (triggerAt == null || triggerAt.isEmpty()) {
            call.reject("triggerAt is required");
            return;
        }

        final long id = idLong;

        try {
            Log.d(TAG, "Scheduling alarm: id=" + id + ", triggerAt=" + triggerAt);
            
            // Parse trigger time
            long triggerTime = parseIsoTime(triggerAt);
            Log.d(TAG, "Parsed trigger time: " + triggerTime + ", current: " + System.currentTimeMillis());
            
            if (triggerTime <= System.currentTimeMillis()) {
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("error", "TIME_IN_PAST");
                result.put("message", "Trigger time is in the past");
                call.resolve(result);
                return;
            }
            
            // Check permission
            boolean hasExactAlarmPermission = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                hasExactAlarmPermission = alarmManager.canScheduleExactAlarms();
                Log.d(TAG, "Android 12+ exact alarm permission: " + hasExactAlarmPermission);
            }
            
            // Create intent
            Intent intent = new Intent(getContext(), AlarmReceiver.class);
            intent.setAction("com.worklog.app.ALARM_ACTION");
            intent.putExtra("alarmId", id);
            intent.putExtra("title", title);
            intent.putExtra("body", body);
            intent.putExtra("shiftId", shiftId);

            int alarmIdInt = (int) id;
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                getContext(),
                alarmIdInt,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            // Try setAlarmClock first (requires permission on Android 12+)
            if (hasExactAlarmPermission) {
                AlarmManager.AlarmClockInfo alarmClockInfo = new AlarmManager.AlarmClockInfo(
                    triggerTime,
                    pendingIntent
                );
                alarmManager.setAlarmClock(alarmClockInfo, pendingIntent);
                Log.d(TAG, "Used setAlarmClock for alarm " + id);
            } else {
                // Fallback: try setExactAndAllowWhileIdle (less reliable but doesn't require exact alarm permission)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        triggerTime,
                        pendingIntent
                    );
                    Log.d(TAG, "Used setExactAndAllowWhileIdle fallback for alarm " + id);
                } else {
                    alarmManager.setExact(
                        AlarmManager.RTC_WAKEUP,
                        triggerTime,
                        pendingIntent
                    );
                    Log.d(TAG, "Used setExact fallback for alarm " + id);
                }
            }

            String formattedTime = formatTime(triggerTime);
            Log.d(TAG, "Scheduled alarm " + id + " at " + formattedTime + " (triggerTime=" + triggerTime + ", now=" + System.currentTimeMillis() + ")");

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("alarmId", id);
            result.put("triggerTime", triggerTime);
            result.put("method", hasExactAlarmPermission ? "setAlarmClock" : "setExactAndAllowWhileIdle");
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule alarm: " + e.getMessage());
            e.printStackTrace();
            call.reject("Failed to schedule alarm: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        long idLong = call.getLong("id");
        
        // If ID is 0 or negative, just return success (nothing to cancel)
        if (idLong <= 0) {
            Log.d(TAG, "Cancel called with invalid ID: " + idLong + ", returning success");
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
            return;
        }

        final long id = idLong;

        try {
            Log.d(TAG, "Canceling alarm: id=" + id);
            Intent intent = new Intent(getContext(), AlarmReceiver.class);
            intent.setAction("com.worklog.app.ALARM_ACTION");

            int alarmIdInt = (int) id;
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                getContext(),
                alarmIdInt,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();

            Log.d(TAG, "Cancelled alarm " + id);

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to cancel alarm: " + e.getMessage());
            call.reject("Failed to cancel alarm: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancelAll(PluginCall call) {
        JSONArray ids = call.getArray("ids");

        if (ids == null) {
            call.reject("ids array is required");
            return;
        }

        try {
            int cancelledCount = 0;
            for (int i = 0; i < ids.length(); i++) {
                try {
                    int id = ids.getInt(i);
                    
                    if (id <= 0) {
                        Log.d(TAG, "Skipping invalid alarm ID: " + id);
                        continue;
                    }
                    
                    Intent intent = new Intent(getContext(), AlarmReceiver.class);
                    intent.setAction("com.worklog.app.ALARM_ACTION");

                    PendingIntent pendingIntent = PendingIntent.getBroadcast(
                        getContext(),
                        id,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );

                    alarmManager.cancel(pendingIntent);
                    pendingIntent.cancel();
                    cancelledCount++;
                    Log.d(TAG, "Cancelled alarm: " + id);
                } catch (Exception e) {
                    Log.e(TAG, "Error canceling alarm at index " + i + ": " + e.getMessage());
                }
            }

            Log.d(TAG, "Cancelled " + cancelledCount + " alarms total");

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("cancelledCount", cancelledCount);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to cancel alarms: " + e.getMessage());
            call.reject("Failed to cancel alarms: " + e.getMessage());
        }
    }

    @PluginMethod
    public void hasPermission(PluginCall call) {
        boolean hasPermission = false;
        String reason = "";
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            hasPermission = alarmManager.canScheduleExactAlarms();
            reason = hasPermission ? "granted" : "not_granted_android12+";
            Log.d(TAG, "Permission check (Android 12+): " + hasPermission);
        } else {
            hasPermission = true;
            reason = "granted_pre_android12";
            Log.d(TAG, "Permission check (pre-Android 12): granted");
        }

        JSObject result = new JSObject();
        result.put("granted", hasPermission);
        result.put("reason", reason);
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        boolean hasPermission = false;
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            hasPermission = alarmManager.canScheduleExactAlarms();
            Log.d(TAG, "Current permission status: " + hasPermission);
            
            if (!hasPermission) {
                try {
                    Intent intent = new Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                    Log.d(TAG, "Opened permission settings");
                } catch (Exception e) {
                    Log.e(TAG, "Failed to open settings: " + e.getMessage());
                }
            }
        } else {
            hasPermission = true;
        }

        // Re-check after a short delay (user returns from settings)
        final boolean finalHasPermission = hasPermission;
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                try {
                    boolean recheckPermission = true;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        recheckPermission = alarmManager.canScheduleExactAlarms();
                    }
                    Log.d(TAG, "Permission after settings: " + recheckPermission);
                } catch (Exception e) {
                    Log.e(TAG, "Error rechecking permission: " + e.getMessage());
                }
            }
        }, 1000);

        JSObject result = new JSObject();
        result.put("requested", true);
        result.put("granted", hasPermission);
        result.put("message", hasPermission ? "Permission already granted" : "Please enable exact alarm permission in settings");
        call.resolve(result);
    }

    private long parseIsoTime(String isoTime) {
        try {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US);
            sdf.setTimeZone(TimeZone.getDefault());
            
            String cleanTime = isoTime;
            if (isoTime.contains(".")) {
                cleanTime = isoTime.substring(0, isoTime.indexOf("."));
            }
            if (cleanTime.endsWith("Z")) {
                cleanTime = cleanTime.substring(0, cleanTime.length() - 1);
            }
            
            Date date = sdf.parse(cleanTime);
            return date != null ? date.getTime() : 0;
        } catch (Exception e) {
            Log.e(TAG, "Failed to parse time: " + isoTime + ", " + e.getMessage());
            return 0;
        }
    }

    private String formatTime(long time) {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault());
        return sdf.format(new Date(time));
    }
}
