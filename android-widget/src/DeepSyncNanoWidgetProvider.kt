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
 * スリムバー・サムネイル・キャッシュ対応
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
        WidgetAutoFlipper.scheduleNext(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        try {
            if (intent.action == ACTION_NEXT_NANO) {
                val prefs = context.getSharedPreferences(WidgetImageHelper.PREFS_NAME, Context.MODE_PRIVATE)
                val currentIndex = prefs.getInt(WidgetImageHelper.KEY_INDEX, 0)
                prefs.edit().putInt(WidgetImageHelper.KEY_INDEX, currentIndex + 1).apply()

                val appWidgetManager = AppWidgetManager.getInstance(context)
                val thisWidget = ComponentName(context, DeepSyncNanoWidgetProvider::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
                for (id in appWidgetIds) {
                    updateWidget(context, appWidgetManager, id)
                }
                WidgetAutoFlipper.scheduleNext(context)
            }
        } catch (t: Throwable) {
            Log.e("DeepSyncNanoWidget", "onReceive error", t)
        }
    }

    companion object {
        const val ACTION_NEXT_NANO = "com.deepsync.widget.ACTION_NEXT_NANO"

        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_nano_layout)
            val prefs = context.getSharedPreferences(WidgetImageHelper.PREFS_NAME, Context.MODE_PRIVATE)

            val slides = WidgetImageHelper.getSlides(context)
            val currentIndex = prefs.getInt(WidgetImageHelper.KEY_INDEX, 0)
            val slide = slides[Math.abs(currentIndex) % slides.size]

            // 1. サムネイル画像のロード (64x64)
            val bitmap = WidgetImageHelper.loadSlideBitmap(
                context,
                slide,
                targetWidth = 80,
                targetHeight = 80,
                cornerRadius = 8f
            ) {
                try {
                    val mgr = AppWidgetManager.getInstance(context)
                    updateWidget(context, mgr, appWidgetId)
                } catch (t: Throwable) {
                    Log.e("DeepSyncNanoWidget", "callback update failed", t)
                }
            }

            if (bitmap != null) {
                views.setImageViewBitmap(R.id.widget_image, bitmap)
            } else {
                views.setImageViewResource(R.id.widget_image, R.drawable.slide_1)
            }

            // 2. サムネイルタップで「次の写真」へ切り替え
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

            // 3. 右側（時計・ポモドーロ）タップでアプリ本体を起動
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
