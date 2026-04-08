# DeepSync Widget

<div align="center">

**デスクトップ常駐型スライドショー × ポモドーロタイマー ウィジェット**

![Tauri](https://img.shields.io/badge/Tauri-v2-blue?logo=tauri)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

## ✨ 特徴

- 🖼️ **スライドショーエンジン** — Google Sheets CSV から画像を取得、Ken Burns エフェクト付きで自動表示
- ⏱️ **ポモドーロタイマー** — 集中/休憩サイクルを管理。休憩中はスライド更新が加速
- 🎨 **ダークサイバーパンクUI** — グロー効果、グラスモーフィズム、スキャンラインアニメーション
- 📐 **4サイズプリセット** — 小(240×360) / 中(320×480) / 大(400×600) / ワイド(480×270)
- 📌 **常に最前面表示** — デスクトップ上に常駐
- 🔍 **メンバー/レイヤーフィルタ** — 表示したいキャラクター・レイヤーを絞り込み

---

## 🚀 セットアップガイド

### 必要な環境

| ツール | バージョン | 用途 |
|--------|-----------|------|
| **Node.js** | v20+ | フロントエンドビルド |
| **npm** | v10+ | パッケージ管理 |
| **Rust** | latest stable | Tauri バックエンド |
| **Visual Studio Build Tools** | 2022+ | C++ コンパイラ (Windows) |
| **WebView2** | latest | ウィンドウ描画エンジン |

---

### Step 1: Rust のインストール

Tauri は Rust で動作するため、Rust ツールチェインのインストールが必須です。

#### 1-1. rustup のインストール

PowerShell を**管理者権限**で開き、以下を実行：

```powershell
# rustup インストーラーをダウンロード・実行
Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile "$env:TEMP\rustup-init.exe"
Start-Process -FilePath "$env:TEMP\rustup-init.exe" -Wait
```

または、ブラウザで [https://rustup.rs](https://rustup.rs/) にアクセスし、インストーラーをダウンロードして実行してください。

#### 1-2. インストール確認

**新しいターミナル**を開いて以下を実行：

```powershell
rustc --version
# 出力例: rustc 1.83.0 (90b35a623 2024-11-26)

cargo --version
# 出力例: cargo 1.83.0 (5ffbef321 2024-10-29)
```

> ⚠️ **インストール後、必ずターミナルを再起動してください。** PATH が更新されるまで `rustc` コマンドは認識されません。

#### 1-3. Rust の更新（必要時）

```powershell
rustup update
```

---

### Step 2: Visual Studio Build Tools のインストール

Rust のコンパイルには C++ ビルドツールが必要です。

#### 方法A: Visual Studio Installer 経由（推奨）

1. [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/) をダウンロード
2. インストーラーを起動
3. **「C++ によるデスクトップ開発」** ワークロードにチェック ✅
4. インストール実行（約2-5GB）

#### 方法B: winget 経由

```powershell
winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools"
```

---

### Step 3: WebView2 Runtime の確認

Windows 10 (バージョン 1803以降) および Windows 11 には通常プリインストール済みです。

確認方法：
```powershell
# レジストリで確認
Get-ItemProperty -Path "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" -ErrorAction SilentlyContinue | Select-Object pv
```

インストールされていない場合: [WebView2 Runtime ダウンロード](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

---

### Step 4: プロジェクトのセットアップ

```powershell
# リポジトリをクローン
git clone https://github.com/YOUR_USERNAME/deepsync-widget.git
cd deepsync-widget

# 依存関係のインストール
npm install

# フロントエンドのみ動作確認（ブラウザ）
npm run dev
# → http://localhost:1420 でプレビュー（Tauri無し）

# Tauri 開発モードで起動（Rust 必須）
npm run tauri dev
```

---

### Step 5: 本番ビルド

```powershell
# Windows インストーラー (.exe) を生成
npm run tauri build

# 出力先: src-tauri/target/release/bundle/nsis/
```

---

## 🔧 自動セットアップスクリプト

環境チェックと依存関係インストールを一括実行：

```powershell
npm run setup
# または直接実行：
powershell -ExecutionPolicy Bypass -File ./scripts/setup.ps1
```

---

## 📁 プロジェクト構造

```
deepsync-widget/
├── src/                          # React フロントエンド
│   ├── App.tsx                   # メインアプリ
│   ├── App.css                   # グローバルスタイル
│   ├── main.tsx                  # エントリーポイント
│   ├── components/
│   │   ├── Slideshow.tsx         # スライドショーエンジン
│   │   ├── Timer.tsx             # ポモドーロタイマー
│   │   ├── HUDOverlay.tsx        # HUDオーバーレイ
│   │   ├── SettingsDrawer.tsx    # 設定ドロワー
│   │   └── FilterPanel.tsx       # フィルタパネル
│   ├── hooks/
│   │   ├── useCsvData.ts         # CSV取得・パース
│   │   ├── useSlideshow.ts       # スライドショー状態管理
│   │   └── usePomodoro.ts        # ポモドーロロジック
│   ├── lib/
│   │   ├── csvParser.ts          # CSVパーサー
│   │   └── windowManager.ts      # Tauriウィンドウ操作
│   ├── types/
│   │   └── index.ts              # 型定義
│   └── styles/                   # CSS モジュール
├── src-tauri/                    # Rust バックエンド
│   ├── src/main.rs
│   ├── tauri.conf.json
│   ├── capabilities/default.json
│   └── Cargo.toml
├── scripts/
│   └── setup.ps1                 # 環境セットアップスクリプト
└── package.json
```

---

## 🎨 デザインシステム

| トークン | 値 | 用途 |
|---------|---|------|
| メインブラック | `#0a0a0c` | 背景（透過90-95%） |
| 集中シアン | `#00f2ff` | Focusモードアクセント |
| 休憩マゼンタ | `#ff00ff` | Breakモードアクセント |
| 見出しフォント | `Playfair Display` | セリフ体 |
| データフォント | `JetBrains Mono` | 等幅フォント |
| 本文フォント | `Inter` | UI テキスト |

---

## 📦 将来の拡張

- [ ] Supabase 統合（認証・作業ログ同期）
- [ ] GitHub Actions CI/CD（自動ビルド・リリース）
- [ ] 専用管理サイト API 連携
- [ ] システムトレイ最小化
- [ ] ホットキー対応

---

## ライセンス

MIT License

追記
5.1 自動ビルド・デリバリー (CI/CD)
ビルド自動化: GitHub Actions を活用し、windows-latest イメージ上でのクラウドビルドを実装。

トリガー: v* タグのプッシュにより、本番用 .exe インストーラーを自動生成。

成果物管理: GitHub Releases へビルド済みバイナリ（NSISインストーラー）を自動アップロード。これにより、開発者はローカルの環境構築（Rust/C++ビルド環境）に依存せず、常にクリーンな環境でリリース資材を作成できる。