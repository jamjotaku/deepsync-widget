#!/usr/bin/env bash
# ===================================================
# DeepSync HUD — Android Multi-Widget Injector Script
# 3種のウィジェット (HUD, Photo Frame, Nano Bar) を自動注入
# ===================================================

set -e

ANDROID_APP_DIR="src-tauri/gen/android/app/src/main"

if [ ! -d "$ANDROID_APP_DIR" ]; then
    echo "[Widget Injector] Android app directory not found. Please run 'tauri android init' first."
    exit 0
fi

echo "[Widget Injector] Injecting Android Multi-Widget assets..."

# レイアウト、ドローアブル、XML設定のコピー
mkdir -p "$ANDROID_APP_DIR/res/layout"
mkdir -p "$ANDROID_APP_DIR/res/xml"
mkdir -p "$ANDROID_APP_DIR/res/drawable"

cp -f android-widget/res/layout/*.xml "$ANDROID_APP_DIR/res/layout/"
cp -f android-widget/res/xml/*.xml "$ANDROID_APP_DIR/res/xml/"
cp -f android-widget/res/drawable/*.xml "$ANDROID_APP_DIR/res/drawable/"

# Kotlin ソースコードのコピー
PACKAGE_DIR="$ANDROID_APP_DIR/java/com/deepsync/widget"
if [ ! -d "$PACKAGE_DIR" ]; then
    PACKAGE_DIR="$ANDROID_APP_DIR/kotlin/com/deepsync/widget"
fi
mkdir -p "$PACKAGE_DIR"
cp -f android-widget/src/*.kt "$PACKAGE_DIR/"

# AndroidManifest.xml の設定
MANIFEST_FILE="$ANDROID_APP_DIR/AndroidManifest.xml"
if [ -f "$MANIFEST_FILE" ]; then
    # INTERNET パーミッション
    if ! grep -q "android.permission.INTERNET" "$MANIFEST_FILE"; then
        sed -i 's|<manifest|<manifest>\n    <uses-permission android:name="android.permission.INTERNET" />|g' "$MANIFEST_FILE"
    fi

    # 1. DeepSyncWidgetProvider (標準 HUD 3x2)
    if ! grep -q "DeepSyncWidgetProvider" "$MANIFEST_FILE"; then
        RECEIVER_1='        <receiver android:name=".DeepSyncWidgetProvider" android:exported="true" android:label="DeepSync HUD (3x2)">\n            <intent-filter>\n                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />\n                <action android:name="com.deepsync.widget.ACTION_NEXT_IMAGE" />\n            </intent-filter>\n            <meta-data android:name="android.appwidget.provider" android:resource="@xml/widget_hud_info" />\n        </receiver>'
        sed -i "s|</application>|$RECEIVER_1\n    </application>|g" "$MANIFEST_FILE"
    fi

    # 2. DeepSyncPhotoWidgetProvider (大画面 Photo Frame 4x3)
    if ! grep -q "DeepSyncPhotoWidgetProvider" "$MANIFEST_FILE"; then
        RECEIVER_2='        <receiver android:name=".DeepSyncPhotoWidgetProvider" android:exported="true" android:label="DeepSync Photo Frame (4x3)">\n            <intent-filter>\n                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />\n                <action android:name="com.deepsync.widget.ACTION_NEXT_PHOTO" />\n            </intent-filter>\n            <meta-data android:name="android.appwidget.provider" android:resource="@xml/widget_photo_info" />\n        </receiver>'
        sed -i "s|</application>|$RECEIVER_2\n    </application>|g" "$MANIFEST_FILE"
    fi

    # 3. DeepSyncNanoWidgetProvider (スリム Nano Bar 4x1)
    if ! grep -q "DeepSyncNanoWidgetProvider" "$MANIFEST_FILE"; then
        RECEIVER_3='        <receiver android:name=".DeepSyncNanoWidgetProvider" android:exported="true" android:label="DeepSync Nano Bar (4x1)">\n            <intent-filter>\n                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />\n                <action android:name="com.deepsync.widget.ACTION_NEXT_NANO" />\n            </intent-filter>\n            <meta-data android:name="android.appwidget.provider" android:resource="@xml/widget_nano_info" />\n        </receiver>'
        sed -i "s|</application>|$RECEIVER_3\n    </application>|g" "$MANIFEST_FILE"
    fi
fi

echo "[Widget Injector] All 3 Android Widgets injected successfully!"
