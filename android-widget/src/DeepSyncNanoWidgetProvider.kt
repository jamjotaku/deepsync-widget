package com.deepsync.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.*
import android.util.Log
import android.widget.RemoteViews
import com.deepsync.widget.R
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * DeepSync Nano Bar — Android Slim Widget Provider (4x1 / 2x1)
 * 横長極小サイバーパンクHUDバー
 */
class DeepSyncNanoWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
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
    }

    companion object {
        const val ACTION_NEXT_NANO = "com.deepsync.widget.ACTION_NEXT_NANO"
        private const val PREFS_NAME = "deepsync_nano_prefs"
        private const val KEY_NANO_INDEX = "nano_slide_index"

        private val THUMB_LIST = listOf(
            "https://pbs.twimg.com/media/GQ0_f43bEAA0q-q.jpg",
            "https://pbs.twimg.com/media/GHb5-QmaAAAp1wB.jpg",
            "https://pbs.twimg.com/media/F99l4mkaEAA-KxN.jpg",
            "https://pbs.twimg.com/media/F3p_s19bUAA-z3B.jpg",
            "https://pbs.twimg.com/media/F5Mh8vcb0AA-hT2.jpg"
        )

        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_nano_layout)
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

            val currentIndex = prefs.getInt(KEY_NANO_INDEX, 0)
            val thumbUrl = THUMB_LIST[Math.floorMod(currentIndex, THUMB_LIST.size)]

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

            // 時計・タイマー部分タップでアプリ起動
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
            } catch (e: Exception) {
                Log.w("DeepSyncNanoWidget", "Launch intent failed", e)
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)

            // 小サムネイルを非同期取得して角丸表示
            thread {
                try {
                    val url = URL(thumbUrl)
                    val conn = url.openConnection() as HttpURLConnection
                    conn.connectTimeout = 6000
                    conn.readTimeout = 6000
                    val original = BitmapFactory.decodeStream(conn.inputStream)
                    if (original != null) {
                        val size = Math.min(original.width, original.height)
                        val square = Bitmap.createBitmap(original, (original.width - size)/2, (original.height - size)/2, size, size)
                        val scaled = Bitmap.createScaledBitmap(square, 100, 100, true)

                        val output = Bitmap.createBitmap(100, 100, Bitmap.Config.ARGB_8888)
                        val canvas = Canvas(output)
                        val paint = Paint().apply { isAntiAlias = true }
                        canvas.drawRoundRect(RectF(0f, 0f, 100f, 100f), 16f, 16f, paint)
                        paint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_IN)
                        canvas.drawBitmap(scaled, 0f, 0f, paint)

                        views.setImageViewBitmap(R.id.widget_image, output)
                        appWidgetManager.updateAppWidget(appWidgetId, views)
                    }
                } catch (e: Exception) {
                    Log.w("DeepSyncNanoWidget", "Thumbnail fetch failed", e)
                }
            }
        }
    }
}
