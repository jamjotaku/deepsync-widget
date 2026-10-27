package com.deepsync.widget

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.JavascriptInterface
import android.widget.Toast
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
    fun syncSlides(slidesJson: String): Boolean {
        Log.d(TAG, "Received slides from Web: ${slidesJson.take(150)}...")
        return try {
            val array = JSONArray(slidesJson)
            val count = array.length()

            // 1. 同期的に即時保存 (commit)
            val prefs = context.getSharedPreferences(WidgetImageHelper.PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(WidgetImageHelper.KEY_CUSTOM_SLIDES, slidesJson).commit()

            // 2. 画面に確認トーストを表示
            Handler(Looper.getMainLooper()).post {
                Toast.makeText(context, "ウィジェット同期完了: ${count}枚の写真を反映しました", Toast.LENGTH_SHORT).show()
            }

            // 3. バックグラウンドで直近の画像を高速プリフェッチ
            thread {
                try {
                    val cacheDir = File(context.filesDir, "widget_cache")
                    if (!cacheDir.exists()) cacheDir.mkdirs()

                    val limit = Math.min(count, 15) // 直近15枚を事前キャッシュ
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

                    // キャッシュ完了後に全ウィジェットを直接再描画
                    Handler(Looper.getMainLooper()).post {
                        WidgetImageHelper.notifyAllWidgets(context)
                    }
                } catch (t: Throwable) {
                    Log.e(TAG, "Error in preloading slides", t)
                }
            }

            // 4. 即座に全ウィジェットを直接再描画（テキストやカウンターを即時反映）
            Handler(Looper.getMainLooper()).post {
                WidgetImageHelper.notifyAllWidgets(context)
                WidgetAutoFlipper.scheduleNext(context)
            }

            true
        } catch (t: Throwable) {
            Log.e(TAG, "syncSlides failed", t)
            false
        }
    }

    /**
     * スライド自動切り替え間隔（秒）の設定
     */
    @JavascriptInterface
    fun setSlideInterval(seconds: Int): Boolean {
        return try {
            WidgetAutoFlipper.setIntervalSeconds(context, seconds)
            true
        } catch (t: Throwable) {
            Log.e(TAG, "setSlideInterval failed", t)
            false
        }
    }
}
