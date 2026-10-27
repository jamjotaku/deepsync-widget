package com.deepsync.widget

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.PointF
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.Rect
import android.graphics.RectF
import android.media.FaceDetector
import android.util.Log

/**
 * DeepSync HUD — 顔認識 ＆ スマートポートレートクロップ
 * Android 標準の FaceDetector を用いて顔を中心に切り抜き、人物写真の頭部・顔見切れを完全に防止
 */
object WidgetFaceHelper {
    private const val TAG = "WidgetFaceHelper"

    /**
     * 顔認識を行い、顔の位置（またはポートレート黄金比）を中心にしてクロップ＆角丸加工
     */
    fun cropToFace(
        source: Bitmap,
        targetWidth: Int,
        targetHeight: Int,
        radius: Float = 14f
    ): Bitmap {
        val srcW = source.width
        val srcH = source.height

        // 1. 顔認識による中心座標の検出
        val faceCenter = detectFaceCenter(source)
        val centerX = faceCenter?.x ?: (srcW / 2f)
        // 顔が見つかった場合はその位置、見つからない場合は上部36%（ポートレート黄金比）
        val centerY = faceCenter?.y ?: (srcH * 0.36f)

        // 2. 切り抜き矩形（アスペクト比 targetWidth : targetHeight）の計算
        val targetRatio = targetWidth.toFloat() / targetHeight.toFloat()
        val srcRatio = srcW.toFloat() / srcH.toFloat()

        val cropW: Int
        val cropH: Int

        if (srcRatio > targetRatio) {
            // 元画像の方が横長 -> 高さを基準に幅を狭める
            cropH = srcH
            cropW = Math.max(1, (srcH * targetRatio).toInt())
        } else {
            // 元画像の方が縦長 -> 幅を基準に高さを狭める
            cropW = srcW
            cropH = Math.max(1, (srcW / targetRatio).toInt())
        }

        // 3. 顔の中心が切り抜き枠の中央（またはやや上寄り）に来るよう配置
        var left = (centerX - cropW / 2f).toInt()
        var top = (centerY - cropH * 0.42f).toInt() // 顔が上寄りに入るよう調整

        // 枠が画像外にはみ出さないようクランプ
        if (left < 0) left = 0
        if (top < 0) top = 0
        if (left + cropW > srcW) left = srcW - cropW
        if (top + cropH > srcH) top = srcH - cropH

        // 4. クロップ & リサイズ
        val safeLeft = Math.max(0, left)
        val safeTop = Math.max(0, top)
        val safeW = Math.min(cropW, srcW - safeLeft)
        val safeH = Math.min(cropH, srcH - safeTop)

        val cropped = Bitmap.createBitmap(source, safeLeft, safeTop, safeW, safeH)
        val scaled = Bitmap.createScaledBitmap(cropped, targetWidth, targetHeight, true)

        // 5. 角丸マスク適用
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
     * Android 標準 FaceDetector で最も大きな顔の中心点を検出
     */
    private fun detectFaceCenter(source: Bitmap): PointF? {
        try {
            // FaceDetector の制約: 幅は偶数、RGB_565 形式が必要
            val safeWidth = if (source.width % 2 != 0) source.width - 1 else source.width
            val safeHeight = source.height
            if (safeWidth <= 0 || safeHeight <= 0) return null

            val bitmap565 = if (source.config == Bitmap.Config.RGB_565 && source.width == safeWidth) {
                source
            } else {
                val copy = Bitmap.createBitmap(safeWidth, safeHeight, Bitmap.Config.RGB_565)
                val canvas = Canvas(copy)
                canvas.drawBitmap(source, 0f, 0f, null)
                copy
            }

            val maxFaces = 1
            val detector = FaceDetector(safeWidth, safeHeight, maxFaces)
            val faces = arrayOfNulls<FaceDetector.Face>(maxFaces)
            val count = detector.findFaces(bitmap565, faces)

            if (count > 0 && faces[0] != null && faces[0]!!.confidence() > 0.4f) {
                val point = PointF()
                faces[0]!!.getMidPoint(point)
                Log.d(TAG, "Face detected at: (${point.x}, ${point.y}), confidence: ${faces[0]!!.confidence()}")
                return point
            }
        } catch (t: Throwable) {
            Log.w(TAG, "Face detection error", t)
        }
        return null
    }
}
