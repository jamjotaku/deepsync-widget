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
 * DeepSync HUD — Android Home Screen Widget Provider
 * 高解像度スライドショー画像表示 ＆ インタラクティブHUD常駐ウィジェット
 */
class DeepSyncWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        if (intent.action == ACTION_NEXT_IMAGE) {
            // 次の画像へインデックスを進める
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val currentIndex = prefs.getInt(KEY_CURRENT_INDEX, 0)
            prefs.edit().putInt(KEY_CURRENT_INDEX, currentIndex + 1).apply()

            // 全ウィジェットを再描画
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val thisWidget = ComponentName(context, DeepSyncWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
            for (id in appWidgetIds) {
                updateAppWidget(context, appWidgetManager, id)
            }
        }
    }

    companion object {
        const val ACTION_NEXT_IMAGE = "com.deepsync.widget.ACTION_NEXT_IMAGE"
        private const val PREFS_NAME = "deepsync_widget_prefs"
        private const val KEY_CURRENT_INDEX = "widget_slide_index"

        // 初回・オフライン用の代表的なGoogle Sheets生存画像リスト
        private val FALLBACK_IMAGES = listOf(
            Triple(
                "https://pbs.twimg.com/media/GQ0_f43bEAA0q-q.jpg",
                "猫又おかゆ",
                "かやさん"
            ),
            Triple(
                "https://pbs.twimg.com/media/GHb5-QmaAAAp1wB.jpg",
                "宝鐘マリン",
                "みそしるさん"
            ),
            Triple(
                "https://pbs.twimg.com/media/F99l4mkaEAA-KxN.jpg",
                "星街すいせい",
                "あかねさん"
            ),
            Triple(
                "https://pbs.twimg.com/media/F3p_s19bUAA-z3B.jpg",
                "湊あくあ",
                "ゆきさん"
            ),
            Triple(
                "https://pbs.twimg.com/media/F5Mh8vcb0AA-hT2.jpg",
                "白銀ノエル",
                "えなこさん"
            )
        )

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_hud_layout)
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

            // 1. 表示する画像の決定
            val currentIndex = prefs.getInt(KEY_CURRENT_INDEX, 0)
            val imageList = FALLBACK_IMAGES
            val currentSlide = imageList[Math.floorMod(currentIndex, imageList.size)]

            // テキストの設定
            views.setTextViewText(R.id.widget_caption, "${currentSlide.second} // ${currentSlide.third}")
            views.setTextViewText(R.id.widget_badge, "HUD // DEEPSYNC [${(Math.floorMod(currentIndex, imageList.size)) + 1}/${imageList.size}]")

            // 2. 右側（テキスト部分）タップでアプリ本体を起動
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
                    views.setOnClickPendingIntent(R.id.widget_root, pendingLaunch)
                }
            } catch (e: Exception) {
                Log.w("DeepSyncWidget", "Failed to attach launch intent", e)
            }

            // 3. 左側（画像サムネイル）タップで「次の画像へ切り替え」
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

            // 4. まず現在のUIを即時適用
            appWidgetManager.updateAppWidget(appWidgetId, views)

            // 5. バックグラウンドで高解像度画像をダウンロードして角丸加工・非同期反映
            thread {
                try {
                    val bitmap = fetchAndCropBitmap(currentSlide.first)
                    if (bitmap != null) {
                        views.setImageViewBitmap(R.id.widget_image, bitmap)
                        appWidgetManager.updateAppWidget(appWidgetId, views)
                    }
                } catch (e: Exception) {
                    Log.w("DeepSyncWidget", "Failed to fetch image: ${currentSlide.first}", e)
                }
            }
        }

        /**
         * 画像URLからBitmapを取得し、正方形・角丸にクロップする
         */
        private fun fetchAndCropBitmap(imageUrl: String): Bitmap? {
            return try {
                val url = URL(imageUrl)
                val conn = url.openConnection() as HttpURLConnection
                conn.doInput = true
                conn.connectTimeout = 6000
                conn.readTimeout = 6000
                conn.connect()

                val input = conn.inputStream
                val original = BitmapFactory.decodeStream(input) ?: return null

                // クロップ（中央正方形）
                val size = Math.min(original.width, original.height)
                val x = (original.width - size) / 2
                val y = (original.height - size) / 2
                val square = Bitmap.createBitmap(original, x, y, size, size)

                // 250x250 にリサイズ
                val scaled = Bitmap.createScaledBitmap(square, 250, 250, true)

                // 角丸加工 (Radius: 20px)
                val output = Bitmap.createBitmap(250, 250, Bitmap.Config.ARGB_8888)
                val canvas = Canvas(output)
                val paint = Paint().apply {
                    isAntiAlias = true
                    color = Color.BLACK
                }
                val rect = RectF(0f, 0f, 250f, 250f)
                canvas.drawRoundRect(rect, 20f, 20f, paint)
                paint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_IN)
                canvas.drawBitmap(scaled, 0f, 0f, paint)

                output
            } catch (e: Exception) {
                Log.e("DeepSyncWidget", "fetchAndCropBitmap error", e)
                null
            }
        }
    }
}
