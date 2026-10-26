package com.deepsync.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log
import android.widget.RemoteViews
import com.deepsync.widget.R

/**
 * DeepSync Nano Bar — Android Slim Widget Provider (4x1 / 2x1)
 */
class DeepSyncNanoWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            try {
                updateWidget(context, appWidgetManager, appWidgetId)
            } catch (t: Throwable) {
                Log.e("DeepSyncNanoWidget", "updateWidget error", t)
            }
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        try {
            if (intent.action == ACTION_NEXT_NANO) {
                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val currentIndex = prefs.getInt(KEY_NANO_INDEX, 0)
                prefs.edit().putInt(KEY_NANO_INDEX, currentIndex + 1).apply()

                val appWidgetManager = AppWidgetManager.getInstance(context)
                val thisWidget = ComponentName(context, DeepSyncNanoWidgetProvider::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
                for (id in appWidgetIds) {
                    updateWidget(context, appWidgetManager, id)
                }
            }
        } catch (t: Throwable) {
            Log.e("DeepSyncNanoWidget", "onReceive error", t)
        }
    }

    companion object {
        const val ACTION_NEXT_NANO = "com.deepsync.widget.ACTION_NEXT_NANO"
        private const val PREFS_NAME = "deepsync_nano_prefs"
        private const val KEY_NANO_INDEX = "nano_slide_index"

        private val THUMBS = listOf(
            R.drawable.slide_1,
            R.drawable.slide_2
        )

        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_nano_layout)
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

            val currentIndex = prefs.getInt(KEY_NANO_INDEX, 0)
            val thumbRes = THUMBS[Math.abs(currentIndex) % THUMBS.size]

            views.setImageViewResource(R.id.widget_image, thumbRes)

            // サムネイルタップで次の画像へ
            val nextIntent = Intent(context, DeepSyncNanoWidgetProvider::class.java).apply {
                action = ACTION_NEXT_NANO
            }
            val pendingNext = PendingIntent.getBroadcast(
                context,
                appWidgetId,
                nextIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_image, pendingNext)

            // 時計・タイマータップでアプリ起動
            try {
                val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                if (launchIntent != null) {
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    val pendingLaunch = PendingIntent.getActivity(
                        context,
                        0,
                        launchIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(R.id.widget_clock, pendingLaunch)
                    views.setOnClickPendingIntent(R.id.widget_pomodoro, pendingLaunch)
                }
            } catch (t: Throwable) {
                Log.w("DeepSyncNanoWidget", "Launch intent failed", t)
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
