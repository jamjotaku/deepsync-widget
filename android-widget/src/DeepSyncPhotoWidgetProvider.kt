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
 * DeepSync Photo Frame — Android Large Widget Provider (4x3 / 4x4)
 * 大画面写真・キャッシュ・非同期フェッチ対応
 */
class DeepSyncPhotoWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            try {
                updateWidget(context, appWidgetManager, appWidgetId)
            } catch (t: Throwable) {
                Log.e("DeepSyncPhotoWidget", "updateWidget error", t)
            }
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        try {
            if (intent.action == ACTION_NEXT_PHOTO) {
                val prefs = context.getSharedPreferences(WidgetImageHelper.PREFS_NAME, Context.MODE_PRIVATE)
                val currentIndex = prefs.getInt(WidgetImageHelper.KEY_INDEX, 0)
                prefs.edit().putInt(WidgetImageHelper.KEY_INDEX, currentIndex + 1).apply()

                val appWidgetManager = AppWidgetManager.getInstance(context)
                val thisWidget = ComponentName(context, DeepSyncPhotoWidgetProvider::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
                for (id in appWidgetIds) {
                    updateWidget(context, appWidgetManager, id)
                }
            }
        } catch (t: Throwable) {
            Log.e("DeepSyncPhotoWidget", "onReceive error", t)
        }
    }

    companion object {
        const val ACTION_NEXT_PHOTO = "com.deepsync.widget.ACTION_NEXT_PHOTO"

        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_photo_layout)
            val prefs = context.getSharedPreferences(WidgetImageHelper.PREFS_NAME, Context.MODE_PRIVATE)

            val slides = WidgetImageHelper.getSlides(context)
            val currentIndex = prefs.getInt(WidgetImageHelper.KEY_INDEX, 0)
            val slide = slides[Math.abs(currentIndex) % slides.size]
            val total = slides.size
            val currentNum = (Math.abs(currentIndex) % total) + 1

            // 1. テキスト・バッジ設定
            views.setTextViewText(R.id.widget_badge, "PHOTO STREAM [$currentNum/$total]")
            views.setTextViewText(R.id.widget_caption, slide.caption)

            // 2. 大画面画像のロード (Binder 1MB 制限回避のため最大 480x360)
            val bitmap = WidgetImageHelper.loadSlideBitmap(
                context,
                slide,
                targetWidth = 480,
                targetHeight = 360,
                cornerRadius = 18f
            ) {
                try {
                    val mgr = AppWidgetManager.getInstance(context)
                    updateWidget(context, mgr, appWidgetId)
                } catch (t: Throwable) {
                    Log.e("DeepSyncPhotoWidget", "callback update failed", t)
                }
            }

            if (bitmap != null) {
                views.setImageViewBitmap(R.id.widget_image, bitmap)
            } else {
                views.setImageViewResource(R.id.widget_image, R.drawable.slide_2)
            }

            // 3. 画像タップで「次の写真」へ切り替え
            val nextIntent = Intent(context, DeepSyncPhotoWidgetProvider::class.java).apply {
                action = ACTION_NEXT_PHOTO
            }
            val pendingNext = PendingIntent.getBroadcast(
                context,
                appWidgetId,
                nextIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_image, pendingNext)

            // 4. 下部HUDバータップでアプリ本体を起動
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
                    views.setOnClickPendingIntent(R.id.widget_caption, pendingLaunch)
                }
            } catch (t: Throwable) {
                Log.w("DeepSyncPhotoWidget", "Launch intent failed", t)
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
