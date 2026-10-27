package com.deepsync.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.Rect
import android.graphics.RectF
import android.util.Log
import org.json.JSONArray
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * DeepSync HUD — ウィジェット画像管理・キャッシュ・同期ヘルパー
 */
data class WidgetSlide(
    val url: String,
    val caption: String,
    val isCustom: Boolean = false
)

object WidgetImageHelper {
    private const val TAG = "WidgetImageHelper"
    const val PREFS_NAME = "deepsync_widget_prefs"
    const val KEY_CUSTOM_SLIDES = "custom_slides_json"
    const val KEY_INDEX = "widget_slide_index"

    /**
     * 登録済みのスライド一覧を取得
     * ユーザー追加のスライドがあればそれを優先、無ければ内蔵デフォルトを返す
     */
    fun getSlides(context: Context): List<WidgetSlide> {
        val list = mutableListOf<WidgetSlide>()
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val jsonStr = prefs.getString(KEY_CUSTOM_SLIDES, null)
            if (!jsonStr.isNullOrEmpty()) {
                val array = JSONArray(jsonStr)
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    val url = obj.optString("url", "")
                    val caption = obj.optString("caption", "Sync Stream")
                    if (url.isNotEmpty()) {
                        list.add(WidgetSlide(url, caption, isCustom = true))
                    }
                }
            }
        } catch (t: Throwable) {
            Log.e(TAG, "Error parsing custom slides", t)
        }

        if (list.isNotEmpty()) {
            return list
        }

        // デフォルトフォールバック
        return listOf(
            WidgetSlide("res://slide_1", "NEO-TOKYO // CYBERPUNK 2088", isCustom = false),
            WidgetSlide("res://slide_2", "ORBITAL TELEMETRY // SECTOR-07", isCustom = false)
        )
    }

    /**
     * スライドの Bitmap を安全に取得（Binder 1MB制限対策・キャッシュ・非同期フェッチ）
     */
    fun loadSlideBitmap(
        context: Context,
        slide: WidgetSlide,
        targetWidth: Int = 360,
        targetHeight: Int = 360,
        cornerRadius: Float = 16f,
        onFetchComplete: () -> Unit
    ): Bitmap? {
        try {
            // 内蔵リソースの場合
            if (slide.url.startsWith("res://")) {
                val resId = if (slide.url.endsWith("slide_2")) R.drawable.slide_2 else R.drawable.slide_1
                val opt = BitmapFactory.Options().apply {
                    inPreferredConfig = Bitmap.Config.RGB_565
                }
                val original = BitmapFactory.decodeResource(context.resources, resId, opt) ?: return null
                return cropAndRoundBitmap(original, targetWidth, targetHeight, cornerRadius)
            }

            // 外部URLの場合: キャッシュファイルを確認
            val cacheDir = File(context.filesDir, "widget_cache")
            if (!cacheDir.exists()) cacheDir.mkdirs()

            val fileName = "slide_${Math.abs(slide.url.hashCode())}.jpg"
            val file = File(cacheDir, fileName)

            if (file.exists() && file.length() > 0) {
                // キャッシュから高速読み込み
                val opt = BitmapFactory.Options().apply {
                    inPreferredConfig = Bitmap.Config.RGB_565
                }
                val original = BitmapFactory.decodeFile(file.absolutePath, opt)
                if (original != null) {
                    return cropAndRoundBitmap(original, targetWidth, targetHeight, cornerRadius)
                }
            }

            // キャッシュが無ければバックグラウンドで安全にフェッチ
            thread {
                fetchAndSaveImage(context, slide.url, file) {
                    onFetchComplete()
                }
            }
        } catch (t: Throwable) {
            Log.e(TAG, "loadSlideBitmap failed: ${slide.url}", t)
        }
        return null
    }

    /**
     * 画像URLからダウンロードして最大 600px にリサイズ保存
     */
    fun fetchAndSaveImage(context: Context, urlStr: String, destFile: File, onComplete: () -> Unit) {
        try {
            val url = URL(urlStr)
            val conn = url.openConnection() as HttpURLConnection
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            conn.setRequestProperty("Accept", "image/*")
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.connect()

            if (conn.responseCode == 200) {
                conn.inputStream.use { input ->
                    val opt = BitmapFactory.Options().apply {
                        inPreferredConfig = Bitmap.Config.RGB_565
                    }
                    val original = BitmapFactory.decodeStream(input, null, opt)
                    if (original != null) {
                        // 最大長辺 600px に縮小（メモリ消費＆Binder通信サイズ削減）
                        val maxDim = 600
                        val scale = Math.min(1.0f, maxDim.toFloat() / Math.max(original.width, original.height))
                        val newW = Math.max(1, (original.width * scale).toInt())
                        val newH = Math.max(1, (original.height * scale).toInt())
                        val scaled = if (scale < 1.0f) {
                            Bitmap.createScaledBitmap(original, newW, newH, true)
                        } else {
                            original
                        }

                        FileOutputStream(destFile).use { out ->
                            scaled.compress(Bitmap.CompressFormat.JPEG, 85, out)
                        }
                        onComplete()
                    }
                }
            }
        } catch (t: Throwable) {
            Log.w(TAG, "Failed to download image: $urlStr", t)
        }
    }

    /**
     * センタークロップ ＆ 角丸加工
     */
    private fun cropAndRoundBitmap(
        source: Bitmap,
        targetWidth: Int,
        targetHeight: Int,
        radius: Float
    ): Bitmap {
        val srcW = source.width
        val srcH = source.height

        // クロップ比率計算
        val scale = Math.max(targetWidth.toFloat() / srcW, targetHeight.toFloat() / srcH)
        val cropW = (targetWidth / scale).toInt()
        val cropH = (targetHeight / scale).toInt()
        val cropX = Math.max(0, (srcW - cropW) / 2)
        val cropY = Math.max(0, (srcH - cropH) / 2)

        val cropped = Bitmap.createBitmap(source, cropX, cropY, Math.min(cropW, srcW - cropX), Math.min(cropH, srcH - cropY))
        val scaled = Bitmap.createScaledBitmap(cropped, targetWidth, targetHeight, true)

        val output = Bitmap.createBitmap(targetWidth, targetHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(output)
        val paint = Paint().apply {
            isAntiAlias = true
            color = -0x1
        }
        val rectF = RectF(0f, 0f, targetWidth.toFloat(), targetHeight.toFloat())

        canvas.drawRoundRect(rectF, radius, radius, paint)
        paint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_IN)
        canvas.drawBitmap(scaled, 0f, 0f, paint)

        return output
    }

    /**
     * 全ウィジェットの一括更新通知
     */
    fun notifyAllWidgets(context: Context) {
        try {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val providers = listOf(
                DeepSyncWidgetProvider::class.java,
                DeepSyncPhotoWidgetProvider::class.java,
                DeepSyncNanoWidgetProvider::class.java
            )
            for (p in providers) {
                val cn = ComponentName(context, p)
                val ids = appWidgetManager.getAppWidgetIds(cn)
                if (ids.isNotEmpty()) {
                    val intent = Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE).apply {
                        putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
                        component = cn
                    }
                    context.sendBroadcast(intent)
                }
            }
        } catch (t: Throwable) {
            Log.e(TAG, "notifyAllWidgets error", t)
        }
    }
}
