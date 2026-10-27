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
 * DeepSync HUD — Android Standard Widget Provider (3x2)
 * ユーザー登録画像・キャッシュ・非同期フェッチ対応
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
                val prefs = context.getSharedPreferences(WidgetImageHelper.PREFS_NAME, Context.MODE_PRIVATE)
                val currentIndex = prefs.getInt(WidgetImageHelper.KEY_INDEX, 0)
                prefs.edit().putInt(WidgetImageHelper.KEY_INDEX, currentIndex + 1).apply()

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

        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_hud_layout)
            val prefs = context.getSharedPreferences(WidgetImageHelper.PREFS_NAME, Context.MODE_PRIVATE)

            val slides = WidgetImageHelper.getSlides(context)
            val currentIndex = prefs.getInt(WidgetImageHelper.KEY_INDEX, 0)
            val slide = slides[Math.abs(currentIndex) % slides.size]
            val total = slides.size
            val currentNum = (Math.abs(currentIndex) % total) + 1

            // 1. テキスト・バッジ設定
            views.setTextViewText(R.id.widget_badge, "HUD // DEEPSYNC [$currentNum/$total]")
            views.setTextViewText(R.id.widget_pomodoro, "CHRONO // 25:00 [FOCUS]")
            views.setTextViewText(R.id.widget_caption, slide.caption)

            // 2. 画像の安全なロード（キャッシュ/フェッチ）
            val bitmap = WidgetImageHelper.loadSlideBitmap(
                context,
                slide,
                targetWidth = 240,
                targetHeight = 240,
                cornerRadius = 12f
            ) {
                // 非同期フェッチ完了時に再描画
                try {
                    val mgr = AppWidgetManager.getInstance(context)
                    updateWidget(context, mgr, appWidgetId)
                } catch (t: Throwable) {
                    Log.e("DeepSyncWidget", "callback update failed", t)
                }
            }

            if (bitmap != null) {
                views.setImageViewBitmap(R.id.widget_image, bitmap)
            } else {
                // フォールバック表示
                views.setImageViewResource(R.id.widget_image, R.drawable.slide_1)
            }

            // 3. 画像タップで「次の写真」へ切り替え
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

            // 4. 右側タップでアプリ本体を起動
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
