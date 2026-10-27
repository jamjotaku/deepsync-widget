package com.deepsync.widget

import android.os.Bundle
import android.webkit.WebView
import app.tauri.TauriActivity

class MainActivity : TauriActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
    }

    override fun onWebViewCreate(webView: WebView) {
        super.onWebViewCreate(webView)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        // React から window.DeepSyncWidgetBridge でネイティブアクセス可能にする
        webView.addJavascriptInterface(WidgetBridge(this), "DeepSyncWidgetBridge")
    }
}
