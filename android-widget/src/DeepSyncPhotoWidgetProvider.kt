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
        } catch (t: Throwable) {
            Log.e("DeepSyncPhotoWidget", "onReceive error", t)
        }
    }

    companion object {
        const val ACTION_NEXT_PHOTO = "com.deepsync.widget.ACTION_NEXT_PHOTO"
        private const val PREFS_NAME = "deepsync_photo_prefs"
        private const val KEY_PHOTO_INDEX = "photo_slide_index"

        private val PHOTOS = listOf(
            Pair(R.drawable.slide_2, "PHOTO STREAM // HERO"),
            Pair(R.drawable.slide_1, "PHOTO STREAM // SECONDARY")
        )

        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_photo_layout)
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

            val currentIndex = prefs.getInt(KEY_PHOTO_INDEX, 0)
            val photo = PHOTOS[Math.abs(currentIndex) % PHOTOS.size]

            views.setImageViewResource(R.id.widget_image, photo.first)
            views.setTextViewText(R.id.widget_caption, photo.second)
            views.setTextViewText(R.id.widget_badge, "PHOTO STREAM [${(Math.abs(currentIndex) % PHOTOS.size) + 1}/${PHOTOS.size}]")

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

            // 下部タップでアプリ起動
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
                    views.setOnClickPendingIntent(R.id.widget_caption, pendingLaunch)
                }
            } catch (t: Throwable) {
                Log.w("DeepSyncPhotoWidget", "Launch intent failed", t)
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
