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
        Integer id = call.getInt("id");
        String triggerAt = call.getString("triggerAt");
        String title = call.getString("title", "提醒");
        String body = call.getString("body", "");
        String shiftId = call.getString("shiftId", "");

        if (id == null || triggerAt == null) {
            call.reject("id and triggerAt are required");
            return;
        }

        try {
            long triggerTime = parseIsoTime(triggerAt);
            
            if (triggerTime <= System.currentTimeMillis()) {
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("error", "Trigger time is in the past");
                call.resolve(result);
                return;
            }

            Intent intent = new Intent(getContext(), AlarmReceiver.class);
            intent.setAction("com.worklog.app.ALARM_ACTION");
            intent.putExtra("alarmId", id);
            intent.putExtra("title", title);
            intent.putExtra("body", body);
            intent.putExtra("shiftId", shiftId);

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                getContext(),
                id,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            AlarmManager.AlarmClockInfo alarmClockInfo = new AlarmManager.AlarmClockInfo(
                triggerTime,
                pendingIntent
            );

            alarmManager.setAlarmClock(alarmClockInfo, pendingIntent);

            String formattedTime = formatTime(triggerTime);
            Log.d(TAG, "Scheduled alarm " + id + " at " + formattedTime);

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("alarmId", id);
            result.put("triggerTime", triggerTime);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule alarm: " + e.getMessage());
            call.reject("Failed to schedule alarm: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        Integer id = call.getInt("id");

        if (id == null) {
            call.reject("id is required");
            return;
        }

        try {
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
                int id = ids.getInt(i);
                
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
            }

            Log.d(TAG, "Cancelled " + cancelledCount + " alarms");

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
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            hasPermission = alarmManager.canScheduleExactAlarms();
        } else {
            hasPermission = true;
        }

        JSObject result = new JSObject();
        result.put("granted", hasPermission);
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (!alarmManager.canScheduleExactAlarms()) {
                try {
                    Intent intent = new Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                    getContext().startActivity(intent);
                } catch (Exception e) {
                    Log.e(TAG, "Failed to open settings: " + e.getMessage());
                }
            }
        }

        JSObject result = new JSObject();
        result.put("requested", true);
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
