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
 * DeepSync Photo Frame — Android Large Widget Provider (4x3 / 4x4)
 * 大画面写真鑑賞メインのウィジェット
 */
class DeepSyncPhotoWidgetProvider : AppWidgetProvider() {

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
        if (intent.action == ACTION_NEXT_PHOTO) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val currentIndex = prefs.getInt(KEY_PHOTO_INDEX, 0)
            prefs.edit().putInt(KEY_PHOTO_INDEX, currentIndex + 1).apply()

            val appWidgetManager = AppWidgetManager.getInstance(context)
            val thisWidget = ComponentName(context, DeepSyncPhotoWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
            for (id in appWidgetIds) {
                updateWidget(context, appWidgetManager, id)
            }
        }
    }

    companion object {
        const val ACTION_NEXT_PHOTO = "com.deepsync.widget.ACTION_NEXT_PHOTO"
        private const val PREFS_NAME = "deepsync_photo_prefs"
        private const val KEY_PHOTO_INDEX = "photo_slide_index"

        private val PHOTO_LIST = listOf(
            Triple("https://pbs.twimg.com/media/GQ0_f43bEAA0q-q.jpg", "猫又おかゆ", "かやさん"),
            Triple("https://pbs.twimg.com/media/GHb5-QmaAAAp1wB.jpg", "宝鐘マリン", "みそしるさん"),
            Triple("https://pbs.twimg.com/media/F99l4mkaEAA-KxN.jpg", "星街すいせい", "あかねさん"),
            Triple("https://pbs.twimg.com/media/F3p_s19bUAA-z3B.jpg", "湊あくあ", "ゆきさん"),
            Triple("https://pbs.twimg.com/media/F5Mh8vcb0AA-hT2.jpg", "白銀ノエル", "えなこさん")
        )

        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_photo_layout)
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

            val currentIndex = prefs.getInt(KEY_PHOTO_INDEX, 0)
            val slide = PHOTO_LIST[Math.floorMod(currentIndex, PHOTO_LIST.size)]

            views.setTextViewText(R.id.widget_caption, "${slide.second} // ${slide.third}")
            views.setTextViewText(R.id.widget_badge, "PHOTO STREAM [${(Math.floorMod(currentIndex, PHOTO_LIST.size)) + 1}/${PHOTO_LIST.size}]")

            // タップで次の写真へ
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

            // 下部タップでアプリ本体を起動
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
                    views.setOnClickPendingIntent(R.id.widget_badge, pendingLaunch)
                    views.setOnClickPendingIntent(R.id.widget_clock, pendingLaunch)
                }
            } catch (e: Exception) {
                Log.w("DeepSyncPhotoWidget", "Launch intent failed", e)
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)

            // 高画質画像を非同期ダウンロードして全面表示
            thread {
                try {
                    val url = URL(slide.first)
                    val conn = url.openConnection() as HttpURLConnection
                    conn.connectTimeout = 6000
                    conn.readTimeout = 6000
                    val input = conn.inputStream
                    val original = BitmapFactory.decodeStream(input)
                    if (original != null) {
                        // 角丸加工 (Radius: 24px)
                        val output = Bitmap.createBitmap(original.width, original.height, Bitmap.Config.ARGB_8888)
                        val canvas = Canvas(output)
                        val paint = Paint().apply { isAntiAlias = true }
                        val rect = RectF(0f, 0f, original.width.toFloat(), original.height.toFloat())
                        canvas.drawRoundRect(rect, 24f, 24f, paint)
                        paint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_IN)
                        canvas.drawBitmap(original, 0f, 0f, paint)

                        views.setImageViewBitmap(R.id.widget_image, output)
                        appWidgetManager.updateAppWidget(appWidgetId, views)
                    }
                } catch (e: Exception) {
                    Log.w("DeepSyncPhotoWidget", "Image download failed", e)
                }
            }
        }
    }
}
