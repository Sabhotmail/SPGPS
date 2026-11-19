package com.spgps.app

import android.webkit.CookieManager
import android.webkit.WebView

object CookieHelper {
    fun enable(webView: WebView) {
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)
    }
}
