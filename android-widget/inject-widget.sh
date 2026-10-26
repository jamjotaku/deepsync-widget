#!/usr/bin/env bash
# ===================================================
# DeepSync HUD — Android Widget Injector Script
# Tauri Android プロジェクトにホーム画面ウィジェットを注入
# ===================================================

set -e

ANDROID_APP_DIR="src-tauri/gen/android/app/src/main"

if [ ! -d "$ANDROID_APP_DIR" ]; then
    echo "[Widget Injector] Android app directory not found. Please run 'tauri android init' first."
    exit 0
fi

echo "[Widget Injector] Injecting Android Widget assets..."

# レイアウト、ドローアブル、XML設定のコピー
mkdir -p "$ANDROID_APP_DIR/res/layout"
mkdir -p "$ANDROID_APP_DIR/res/xml"
mkdir -p "$ANDROID_APP_DIR/res/drawable"
cp -f android-widget/res/layout/widget_hud_layout.xml "$ANDROID_APP_DIR/res/layout/"
cp -f android-widget/res/xml/widget_hud_info.xml "$ANDROID_APP_DIR/res/xml/"
cp -f android-widget/res/drawable/widget_bg.xml "$ANDROID_APP_DIR/res/drawable/"

# Kotlin ソースコードのコピー
PACKAGE_DIR="$ANDROID_APP_DIR/java/com/deepsync/widget"
if [ ! -d "$PACKAGE_DIR" ]; then
    PACKAGE_DIR="$ANDROID_APP_DIR/kotlin/com/deepsync/widget"
fi
mkdir -p "$PACKAGE_DIR"
cp -f android-widget/src/DeepSyncWidgetProvider.kt "$PACKAGE_DIR/"

# AndroidManifest.xml にウィジェットの receiver を追記（未登録の場合のみ）
MANIFEST_FILE="$ANDROID_APP_DIR/AndroidManifest.xml"
if [ -f "$MANIFEST_FILE" ]; then
    if ! grep -q "DeepSyncWidgetProvider" "$MANIFEST_FILE"; then
        echo "[Widget Injector] Registering DeepSyncWidgetProvider in AndroidManifest.xml..."
        # </application> の直前に receiver を挿入
        RECEIVER_SNIPPET='        <receiver android:name=".DeepSyncWidgetProvider" android:exported="true">\n            <intent-filter>\n                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />\n            </intent-filter>\n            <meta-data android:name="android.appwidget.provider" android:resource="@xml/widget_hud_info" />\n        </receiver>\n    </application>'
        sed -i "s|</application>|$RECEIVER_SNIPPET|g" "$MANIFEST_FILE"
    fi
fi

echo "[Widget Injector] Android Widget injected successfully!"
