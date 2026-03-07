package com.worklog.app;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.worklog.app.plugins.SystemAlarmPlugin;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    private static final int REQUEST_CODE_FILE_CHOOSER = 1001;
    
    private ValueCallback<Uri[]> mFilePathCallback;
    private BroadcastReceiver alarmDismissedReceiver;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SystemAlarmPlugin.class);
        super.onCreate(savedInstanceState);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        
        this.bridge.getWebView().setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (mFilePathCallback != null) {
                    mFilePathCallback.onReceiveValue(null);
                }
                mFilePathCallback = filePathCallback;
                
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                
                try {
                    startActivityForResult(Intent.createChooser(intent, "Select CSV File"), REQUEST_CODE_FILE_CHOOSER);
                } catch (Exception e) {
                    mFilePathCallback.onReceiveValue(null);
                    mFilePathCallback = null;
                    return false;
                }
                return true;
            }
        });
        
        // Register BroadcastReceiver for alarm dismissed
        alarmDismissedReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                Log.d(TAG, "Received ALARM_DISMISSED broadcast");
                handleAlarmDismissed();
            }
        };
        
        IntentFilter filter = new IntentFilter("com.worklog.app.ALARM_DISMISSED");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(alarmDismissedReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(alarmDismissedReceiver, filter);
        }
    }

    private void handleAlarmDismissed() {
        try {
            // Clear the SharedPreferences flag
            SharedPreferences prefs = getSharedPreferences("worklog_prefs", MODE_PRIVATE);
            prefs.edit().putBoolean("alarmDismissed", false).apply();
            
            // Execute JavaScript to stop the timer
            WebView webView = this.bridge.getWebView();
            String jsCode = "if (window.stopAlarmTimer) { window.stopAlarmTimer(); }";
            webView.evaluateJavascript(jsCode, null);
            Log.d(TAG, "Executed stopAlarmTimer JS");
        } catch (Exception e) {
            Log.e(TAG, "Error handling alarm dismissed: " + e.getMessage());
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            if (alarmDismissedReceiver != null) {
                unregisterReceiver(alarmDismissedReceiver);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error unregistering receiver: " + e.getMessage());
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        checkAndHandleAlarmDismissed();
    }

    private void checkAndHandleAlarmDismissed() {
        try {
            SharedPreferences prefs = getSharedPreferences("worklog_prefs", MODE_PRIVATE);
            boolean alarmDismissed = prefs.getBoolean("alarmDismissed", false);
            
            if (alarmDismissed) {
                Log.d(TAG, "Alarm dismissed flag detected");
                prefs.edit().putBoolean("alarmDismissed", false).apply();
                
                // Execute JavaScript to stop the timer using WebView
                WebView webView = this.bridge.getWebView();
                String jsCode = "if (window.stopAlarmTimer) { window.stopAlarmTimer(); }";
                webView.evaluateJavascript(jsCode, null);
                Log.d(TAG, "Executed stopAlarmTimer JS via onResume");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking alarmDismissed: " + e.getMessage());
        }
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        
        if (requestCode == REQUEST_CODE_FILE_CHOOSER) {
            if (mFilePathCallback != null) {
                Uri[] results = null;
                if (resultCode == Activity.RESULT_OK && data != null) {
                    String dataString = data.getDataString();
                    if (dataString != null) {
                        results = new Uri[]{Uri.parse(dataString)};
                    }
                }
                mFilePathCallback.onReceiveValue(results);
                mFilePathCallback = null;
            }
        }
    }
}
