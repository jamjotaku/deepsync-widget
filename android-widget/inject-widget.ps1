# ===================================================
# DeepSync HUD — Android Multi-Widget Injector Script (PowerShell)
# 3種のウィジェット (HUD, Photo Frame, Nano Bar) を自動注入
# ===================================================

$ErrorActionPreference = "Stop"

$androidAppDir = "src-tauri/gen/android/app/src/main"

if (-not (Test-Path $androidAppDir)) {
    Write-Host "[Widget Injector] Android app directory not found. Please run 'tauri android init' first."
    exit 0
}

Write-Host "[Widget Injector] Injecting Android Multi-Widget assets..."

# ディレクトリ作成
New-Item -ItemType Directory -Force -Path "$androidAppDir/res/layout" | Out-Null
New-Item -ItemType Directory -Force -Path "$androidAppDir/res/xml" | Out-Null
New-Item -ItemType Directory -Force -Path "$androidAppDir/res/drawable" | Out-Null

# アセットのコピー
Copy-Item -Force "android-widget/res/layout/*.xml" "$androidAppDir/res/layout/"
Copy-Item -Force "android-widget/res/xml/*.xml" "$androidAppDir/res/xml/"
Copy-Item -Force "android-widget/res/drawable/*.xml" "$androidAppDir/res/drawable/"

# Kotlin ソースコードのコピー
$packageDir = "$androidAppDir/java/com/deepsync/widget"
if (-not (Test-Path $packageDir)) {
    $packageDir = "$androidAppDir/kotlin/com/deepsync/widget"
}
New-Item -ItemType Directory -Force -Path $packageDir | Out-Null
Copy-Item -Force "android-widget/src/*.kt" "$packageDir/"

# AndroidManifest.xml の設定
$manifestFile = "$androidAppDir/AndroidManifest.xml"
if (Test-Path $manifestFile) {
    $manifestContent = Get-Content $manifestFile -Raw

    if (-not ($manifestContent -match "android.permission.INTERNET")) {
        $manifestContent = $manifestContent -replace '<manifest.*?>', "`$0`n    <uses-permission android:name=`"android.permission.INTERNET`" />"
    }

    if (-not ($manifestContent -match "DeepSyncWidgetProvider")) {
        $receiver1 = @"
        <receiver android:name=".DeepSyncWidgetProvider" android:exported="true" android:label="DeepSync HUD (3x2)">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
                <action android:name="com.deepsync.widget.ACTION_NEXT_IMAGE" />
            </intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/widget_hud_info" />
        </receiver>
"@
        $manifestContent = $manifestContent -replace '</application>', "$receiver1`n    </application>"
    }

    if (-not ($manifestContent -match "DeepSyncPhotoWidgetProvider")) {
        $receiver2 = @"
        <receiver android:name=".DeepSyncPhotoWidgetProvider" android:exported="true" android:label="DeepSync Photo Frame (4x3)">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
                <action android:name="com.deepsync.widget.ACTION_NEXT_PHOTO" />
            </intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/widget_photo_info" />
        </receiver>
"@
        $manifestContent = $manifestContent -replace '</application>', "$receiver2`n    </application>"
    }

    if (-not ($manifestContent -match "DeepSyncNanoWidgetProvider")) {
        $receiver3 = @"
        <receiver android:name=".DeepSyncNanoWidgetProvider" android:exported="true" android:label="DeepSync Nano Bar (4x1)">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
                <action android:name="com.deepsync.widget.ACTION_NEXT_NANO" />
            </intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/widget_nano_info" />
        </receiver>
"@
        $manifestContent = $manifestContent -replace '</application>', "$receiver3`n    </application>"
    }

    Set-Content -Path $manifestFile -Value $manifestContent
}

Write-Host "[Widget Injector] All 3 Android Widgets injected successfully!"
