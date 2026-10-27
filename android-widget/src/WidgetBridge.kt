package com.deepsync.widget

import android.content.Context
import android.util.Log
import android.webkit.JavascriptInterface
import org.json.JSONArray
import java.io.File
import kotlin.concurrent.thread

/**
 * DeepSync HUD — Webview ↔ Android Native Bridge
 * React フロントエンドから送信された画像プレイリストを SharedPreferences に保存＆プリフェッチ
 */
class WidgetBridge(private val context: Context) {

    companion object {
        private const val TAG = "WidgetBridge"
    }

    @JavascriptInterface
    fun syncSlides(slidesJson: String) {
        Log.d(TAG, "Received slides from Web: ${slidesJson.take(150)}...")
        try {
            val prefs = context.getSharedPreferences(WidgetImageHelper.PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(WidgetImageHelper.KEY_CUSTOM_SLIDES, slidesJson).apply()

            // バックグラウンドで画像キャッシュを事前ダウンロード
            thread {
                try {
                    val cacheDir = File(context.filesDir, "widget_cache")
                    if (!cacheDir.exists()) cacheDir.mkdirs()

                    val array = JSONArray(slidesJson)
                    val limit = Math.min(array.length(), 15) // 直近15枚を事前キャッシュ
                    for (i in 0 until limit) {
                        val obj = array.getJSONObject(i)
                        val url = obj.optString("url", "")
                        if (url.isEmpty()) continue

                        val fileName = "slide_${Math.abs(url.hashCode())}.jpg"
                        val destFile = File(cacheDir, fileName)
                        if (!destFile.exists() || destFile.length() == 0L) {
                            WidgetImageHelper.fetchAndSaveImage(context, url, destFile) {}
                        }
                    }

                    // キャッシュ完了後に全ウィジェットを更新
                    WidgetImageHelper.notifyAllWidgets(context)
                } catch (t: Throwable) {
                    Log.e(TAG, "Error in preloading slides", t)
                }
            }

            // 即座にも一度通知
            WidgetImageHelper.notifyAllWidgets(context)

        } catch (t: Throwable) {
            Log.e(TAG, "syncSlides failed", t)
        }
    }
}
