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
 * DeepSync HUD — Android Home Screen Widget Provider (3x2)
 * 超堅牢・絶対クラッシュしない実装
 */
class DeepSyncWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            try {
                updateWidget(context, appWidgetManager, appWidgetId)
            } catch (t: Throwable) {
                Log.e("DeepSyncWidget", "updateWidget error", t)
            }
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        try {
            if (intent.action == ACTION_NEXT_IMAGE) {
                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val currentIndex = prefs.getInt(KEY_INDEX, 0)
                prefs.edit().putInt(KEY_INDEX, currentIndex + 1).apply()

                val appWidgetManager = AppWidgetManager.getInstance(context)
                val thisWidget = ComponentName(context, DeepSyncWidgetProvider::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
                for (id in appWidgetIds) {
                    updateWidget(context, appWidgetManager, id)
                }
            }
        } catch (t: Throwable) {
            Log.e("DeepSyncWidget", "onReceive error", t)
        }
    }

    companion object {
        const val ACTION_NEXT_IMAGE = "com.deepsync.widget.ACTION_NEXT_IMAGE"
        private const val PREFS_NAME = "deepsync_widget_prefs"
        private const val KEY_INDEX = "widget_slide_index"

        private val SLIDES = listOf(
            Pair(R.drawable.slide_1, "HUD // STREAM ALPHA"),
            Pair(R.drawable.slide_2, "HUD // STREAM BETA")
        )

        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_hud_layout)
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

            val currentIndex = prefs.getInt(KEY_INDEX, 0)
            val slide = SLIDES[Math.abs(currentIndex) % SLIDES.size]

            // 1. 画像とテキストを安全かつ瞬時に設定
            views.setImageViewResource(R.id.widget_image, slide.first)
            views.setTextViewText(R.id.widget_caption, slide.second)
            views.setTextViewText(R.id.widget_badge, "HUD // DEEPSYNC [${(Math.abs(currentIndex) % SLIDES.size) + 1}/${SLIDES.size}]")

            // 2. 画像タップで次の画像へ
            val nextIntent = Intent(context, DeepSyncWidgetProvider::class.java).apply {
                action = ACTION_NEXT_IMAGE
            }
            val pendingNext = PendingIntent.getBroadcast(
                context,
                appWidgetId,
                nextIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_image, pendingNext)

            // 3. 右側タップでアプリ本体を起動
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
                    views.setOnClickPendingIntent(R.id.widget_badge, pendingLaunch)
                }
            } catch (t: Throwable) {
                Log.w("DeepSyncWidget", "Launch intent failed", t)
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
