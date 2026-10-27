package com.deepsync.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log

/**
 * DeepSync HUD — ウィジェット自動スライドショー・スケジューラー
 * 指定間隔（デフォルト20秒）ごとに自動的に次の写真へパラパラと切り替える
 */
class WidgetAutoFlipper : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == ACTION_AUTO_FLIP) {
            Log.d(TAG, "ACTION_AUTO_FLIP triggered")
            try {
                // インデックスをインクリメント
                val prefs = context.getSharedPreferences(WidgetImageHelper.PREFS_NAME, Context.MODE_PRIVATE)
                val current = prefs.getInt(WidgetImageHelper.KEY_INDEX, 0)
                prefs.edit().putInt(WidgetImageHelper.KEY_INDEX, current + 1).apply()

                // 全ウィジェットを直接更新
                WidgetImageHelper.notifyAllWidgets(context)

                // 次回の自動送りをスケジュール
                scheduleNext(context)
            } catch (t: Throwable) {
                Log.e(TAG, "Auto flip execution error", t)
            }
        }
    }

    companion object {
        private const val TAG = "WidgetAutoFlipper"
        const val ACTION_AUTO_FLIP = "com.deepsync.widget.ACTION_AUTO_FLIP"
        const val KEY_INTERVAL_MS = "widget_auto_flip_interval_ms"
        const val DEFAULT_INTERVAL_MS = 20000L // デフォルト20秒

        private val handler = Handler(Looper.getMainLooper())
        private var isHandlerRunning = false

        /**
         * 次のスライド自動送りをスケジュール (AlarmManager + メインループ)
         */
        fun scheduleNext(context: Context) {
            try {
                val prefs = context.getSharedPreferences(WidgetImageHelper.PREFS_NAME, Context.MODE_PRIVATE)
                val interval = prefs.getLong(KEY_INTERVAL_MS, DEFAULT_INTERVAL_MS)

                // 1. AlarmManager による高信頼な定期タイマー
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
                if (alarmManager != null) {
                    val intent = Intent(context, WidgetAutoFlipper::class.java).apply {
                        action = ACTION_AUTO_FLIP
                    }
                    val pendingIntent = PendingIntent.getBroadcast(
                        context,
                        1001,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )

                    val triggerAt = SystemClock.elapsedRealtime() + interval
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        alarmManager.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pendingIntent)
                    } else {
                        alarmManager.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pendingIntent)
                    }
                }

                // 2. 画面点灯中・常駐用の軽量 Handler ループ
                handler.removeCallbacksAndMessages(null)
                handler.postDelayed({
                    try {
                        val current = prefs.getInt(WidgetImageHelper.KEY_INDEX, 0)
                        prefs.edit().putInt(WidgetImageHelper.KEY_INDEX, current + 1).apply()
                        WidgetImageHelper.notifyAllWidgets(context)
                        scheduleNext(context)
                    } catch (t: Throwable) {
                        Log.w(TAG, "Handler flip error", t)
                    }
                }, interval)

            } catch (t: Throwable) {
                Log.e(TAG, "scheduleNext failed", t)
            }
        }

        /**
         * スライド更新間隔を設定 (秒単位)
         */
        fun setIntervalSeconds(context: Context, seconds: Int) {
            val safeSec = Math.max(5, seconds) // 最短5秒
            val prefs = context.getSharedPreferences(WidgetImageHelper.PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putLong(KEY_INTERVAL_MS, safeSec * 1000L).apply()
            Log.d(TAG, "Updated auto flip interval: ${safeSec}s")
            scheduleNext(context)
        }
    }
}
