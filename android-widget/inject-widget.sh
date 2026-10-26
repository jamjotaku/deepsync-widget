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
cp -f android-widget/res/drawable/* "$ANDROID_APP_DIR/res/drawable/"

# Kotlin ソースコードのコピー
PACKAGE_DIR="$ANDROID_APP_DIR/java/com/deepsync/widget"
if [ ! -d "$PACKAGE_DIR" ]; then
    PACKAGE_DIR="$ANDROID_APP_DIR/kotlin/com/deepsync/widget"
fi
mkdir -p "$PACKAGE_DIR"
cp -f android-widget/src/*.kt "$PACKAGE_DIR/"

# AndroidManifest.xml の安全な書き換え (Python)
MANIFEST_FILE="$ANDROID_APP_DIR/AndroidManifest.xml"
if [ -f "$MANIFEST_FILE" ]; then
    echo "[Widget Injector] Injecting receivers into AndroidManifest.xml safely with Python..."
    python3 -c "
with open('$MANIFEST_FILE', 'r') as f:
    content = f.read()

receivers = '''
        <receiver android:name=\".DeepSyncWidgetProvider\" android:exported=\"true\" android:label=\"DeepSync HUD (3x2)\">
            <intent-filter>
                <action android:name=\"android.appwidget.action.APPWIDGET_UPDATE\" />
                <action android:name=\"com.deepsync.widget.ACTION_NEXT_IMAGE\" />
            </intent-filter>
            <meta-data android:name=\"android.appwidget.provider\" android:resource=\"@xml/widget_hud_info\" />
        </receiver>

        <receiver android:name=\".DeepSyncPhotoWidgetProvider\" android:exported=\"true\" android:label=\"DeepSync Photo Frame (4x3)\">
            <intent-filter>
                <action android:name=\"android.appwidget.action.APPWIDGET_UPDATE\" />
                <action android:name=\"com.deepsync.widget.ACTION_NEXT_PHOTO\" />
            </intent-filter>
            <meta-data android:name=\"android.appwidget.provider\" android:resource=\"@xml/widget_photo_info\" />
        </receiver>

        <receiver android:name=\".DeepSyncNanoWidgetProvider\" android:exported=\"true\" android:label=\"DeepSync Nano Bar (4x1)\">
            <intent-filter>
                <action android:name=\"android.appwidget.action.APPWIDGET_UPDATE\" />
                <action android:name=\"com.deepsync.widget.ACTION_NEXT_NANO\" />
            </intent-filter>
            <meta-data android:name=\"android.appwidget.provider\" android:resource=\"@xml/widget_nano_info\" />
        </receiver>
'''

if 'DeepSyncWidgetProvider' not in content:
    content = content.replace('</application>', receivers + '\n    </application>')

if 'android.permission.INTERNET' not in content:
    content = content.replace('<application', '<uses-permission android:name=\"android.permission.INTERNET\" />\n    <application')

with open('$MANIFEST_FILE', 'w') as f:
    f.write(content)
"
fi

echo "[Widget Injector] All 3 Android Widgets injected successfully!"
