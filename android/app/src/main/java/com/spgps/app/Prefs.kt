package com.spgps.app

import android.content.Context

object Prefs {
    private const val NAME = "spgps_prefs"
    private const val KEY_BASE_URL = "base_url"

    private fun prefs(context: Context) =
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)

    fun getBaseUrl(context: Context): String =
        prefs(context).getString(KEY_BASE_URL, "")?.trim().orEmpty()

    fun setBaseUrl(context: Context, url: String) {
        prefs(context).edit().putString(KEY_BASE_URL, normalizeUrl(url)).apply()
    }

    fun hasBaseUrl(context: Context): Boolean = getBaseUrl(context).isNotEmpty()

    fun normalizeUrl(raw: String): String {
        var url = raw.trim()
        while (url.endsWith("/")) {
            url = url.dropLast(1)
        }
        return url
    }

    fun isValidHttpUrl(raw: String): Boolean {
        val url = normalizeUrl(raw)
        return url.startsWith("http://") || url.startsWith("https://")
    }
}
