# ============================================================
# DeepSync Widget — 環境セットアップスクリプト (Windows)
# 実行: powershell -ExecutionPolicy Bypass -File ./scripts/setup.ps1
# ============================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DeepSync Widget - Environment Setup  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$hasErrors = $false

# ── 1. Node.js チェック ──
Write-Host "[1/5] Node.js..." -NoNewline
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host " OK ($nodeVersion)" -ForegroundColor Green
    } else {
        throw "not found"
    }
} catch {
    Write-Host " NOT FOUND" -ForegroundColor Red
    Write-Host "  -> https://nodejs.org/ からインストールしてください" -ForegroundColor Yellow
    $hasErrors = $true
}

# ── 2. npm チェック ──
Write-Host "[2/5] npm..." -NoNewline
try {
    $npmVersion = npm --version 2>$null
    if ($npmVersion) {
        Write-Host " OK (v$npmVersion)" -ForegroundColor Green
    } else {
        throw "not found"
    }
} catch {
    Write-Host " NOT FOUND" -ForegroundColor Red
    Write-Host "  -> Node.js に同梱されています" -ForegroundColor Yellow
    $hasErrors = $true
}

# ── 3. Rust チェック ──
Write-Host "[3/5] Rust (rustc)..." -NoNewline
try {
    $rustVersion = rustc --version 2>$null
    if ($rustVersion) {
        Write-Host " OK ($rustVersion)" -ForegroundColor Green
    } else {
        throw "not found"
    }
} catch {
    Write-Host " NOT FOUND" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Rust のインストールが必要です:" -ForegroundColor Yellow
    Write-Host "  ──────────────────────────────────" -ForegroundColor DarkGray
    Write-Host "  方法1: ブラウザから" -ForegroundColor White
    Write-Host "    https://rustup.rs/ にアクセスしてインストーラーをダウンロード" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  方法2: PowerShell から (このまま実行)" -ForegroundColor White
    Write-Host "    Invoke-WebRequest -Uri 'https://win.rustup.rs/x86_64' -OutFile `"`$env:TEMP\rustup-init.exe`"" -ForegroundColor Gray
    Write-Host "    Start-Process -FilePath `"`$env:TEMP\rustup-init.exe`" -Wait" -ForegroundColor Gray
    Write-Host "  ──────────────────────────────────" -ForegroundColor DarkGray
    Write-Host ""

    $installRust = Read-Host "  今すぐ Rust をインストールしますか？ (y/N)"
    if ($installRust -eq 'y' -or $installRust -eq 'Y') {
        Write-Host "  Rust インストーラーをダウンロード中..." -ForegroundColor Cyan
        try {
            $rustupPath = "$env:TEMP\rustup-init.exe"
            Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile $rustupPath
            Write-Host "  インストーラーを起動します..." -ForegroundColor Cyan
            Write-Host "  ※ デフォルト設定 (1) で進めることを推奨します" -ForegroundColor Yellow
            Start-Process -FilePath $rustupPath -Wait
            Write-Host "  Rust インストール完了！" -ForegroundColor Green
            Write-Host "  ⚠ ターミナルを再起動してから再度このスクリプトを実行してください" -ForegroundColor Yellow
        } catch {
            Write-Host "  ダウンロードに失敗しました: $_" -ForegroundColor Red
        }
    }
    $hasErrors = $true
}

# ── 4. Cargo チェック ──
Write-Host "[4/5] Cargo..." -NoNewline
try {
    $cargoVersion = cargo --version 2>$null
    if ($cargoVersion) {
        Write-Host " OK ($cargoVersion)" -ForegroundColor Green
    } else {
        throw "not found"
    }
} catch {
    Write-Host " NOT FOUND (Rust と一緒にインストールされます)" -ForegroundColor Yellow
    $hasErrors = $true
}

# ── 5. WebView2 チェック ──
Write-Host "[5/5] WebView2 Runtime..." -NoNewline
try {
    $wv2 = Get-ItemProperty -Path "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" -ErrorAction Stop
    if ($wv2.pv) {
        Write-Host " OK (v$($wv2.pv))" -ForegroundColor Green
    } else {
        throw "not found"
    }
} catch {
    # 代替チェック
    try {
        $wv2Alt = Get-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" -ErrorAction Stop
        if ($wv2Alt.pv) {
            Write-Host " OK (v$($wv2Alt.pv))" -ForegroundColor Green
        } else {
            throw "not found"
        }
    } catch {
        Write-Host " UNKNOWN (Windows 10/11 には通常プリインストール済み)" -ForegroundColor Yellow
        Write-Host "  -> もし起動に失敗する場合: https://developer.microsoft.com/en-us/microsoft-edge/webview2/" -ForegroundColor Gray
    }
}

Write-Host ""

# ── 結果サマリー ──
if ($hasErrors) {
    Write-Host "──────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host "⚠ 一部の依存関係が不足しています" -ForegroundColor Yellow
    Write-Host "上記の手順に従ってインストール後、" -ForegroundColor Yellow
    Write-Host "このスクリプトを再実行してください。" -ForegroundColor Yellow
    Write-Host "──────────────────────────────────────" -ForegroundColor DarkGray
} else {
    Write-Host "──────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host "✅ 全ての依存関係が揃っています！" -ForegroundColor Green
    Write-Host ""

    $runInstall = Read-Host "npm install を実行しますか？ (Y/n)"
    if ($runInstall -ne 'n' -and $runInstall -ne 'N') {
        Write-Host "npm install を実行中..." -ForegroundColor Cyan
        npm install
        Write-Host ""
        Write-Host "✅ セットアップ完了！" -ForegroundColor Green
        Write-Host ""
        Write-Host "以下のコマンドで開発を開始できます:" -ForegroundColor White
        Write-Host "  npm run dev          # フロントエンドのみ (ブラウザプレビュー)" -ForegroundColor Gray
        Write-Host "  npm run tauri dev    # Tauri ウィジェットとして起動" -ForegroundColor Gray
        Write-Host "  npm run tauri build  # 本番ビルド (インストーラー生成)" -ForegroundColor Gray
    }
}

Write-Host ""
