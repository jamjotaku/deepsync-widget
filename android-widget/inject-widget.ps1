# ===================================================
# DeepSync HUD — Android Widget Injector Script (PowerShell)
# ===================================================

$ErrorActionPreference = "Stop"

$androidAppDir = "src-tauri/gen/android/app/src/main"

if (-not (Test-Path $androidAppDir)) {
    Write-Host "[Widget Injector] Android app directory not found. Please run 'tauri android init' first."
    exit 0
}

Write-Host "[Widget Injector] Injecting Android Widget assets..."

# レイアウト、ドローアブル、XMLのコピー
New-Item -ItemType Directory -Force -Path "$androidAppDir/res/layout" | Out-Null
New-Item -ItemType Directory -Force -Path "$androidAppDir/res/xml" | Out-Null
New-Item -ItemType Directory -Force -Path "$androidAppDir/res/drawable" | Out-Null
Copy-Item -Force "android-widget/res/layout/widget_hud_layout.xml" "$androidAppDir/res/layout/"
Copy-Item -Force "android-widget/res/xml/widget_hud_info.xml" "$androidAppDir/res/xml/"
Copy-Item -Force "android-widget/res/drawable/widget_bg.xml" "$androidAppDir/res/drawable/"

# Kotlin ソースコードのコピー
$packageDir = "$androidAppDir/java/com/deepsync/widget"
if (-not (Test-Path $packageDir)) {
    $packageDir = "$androidAppDir/kotlin/com/deepsync/widget"
}
New-Item -ItemType Directory -Force -Path $packageDir | Out-Null
Copy-Item -Force "android-widget/src/DeepSyncWidgetProvider.kt" "$packageDir/"

# AndroidManifest.xml にウィジェットの receiver を追記
$manifestFile = "$androidAppDir/AndroidManifest.xml"
if (Test-Path $manifestFile) {
    $manifestContent = Get-Content $manifestFile -Raw
    if (-not ($manifestContent -match "DeepSyncWidgetProvider")) {
        Write-Host "[Widget Injector] Registering DeepSyncWidgetProvider in AndroidManifest.xml..."
        $receiverSnippet = @"
        <receiver android:name=".DeepSyncWidgetProvider" android:exported="true">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/widget_hud_info" />
        </receiver>
    </application>
"@
        $manifestContent = $manifestContent -replace '</application>', $receiverSnippet
        Set-Content -Path $manifestFile -Value $manifestContent
    }
}

Write-Host "[Widget Injector] Android Widget injected successfully!"
