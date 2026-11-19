package com.spgps.app

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.os.Message
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.spgps.app.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private var pageError = false

    private val settingsLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) {
            if (Prefs.hasBaseUrl(this)) {
                loadPortal()
            } else {
                openSettingsFlow()
            }
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.toolbar.inflateMenu(R.menu.menu_main)
        binding.toolbar.setOnMenuItemClickListener { item ->
            if (item.itemId == R.id.action_settings) {
                openSettingsFlow()
                true
            } else {
                false
            }
        }

        binding.btnRetry.setOnClickListener { loadPortal() }
        binding.btnOpenSettings.setOnClickListener { openSettingsFlow() }

        val settings = binding.webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
        settings.setSupportMultipleWindows(true)
        settings.javaScriptCanOpenWindowsAutomatically = true
        settings.userAgentString = settings.userAgentString + " SPGPSAndroid/1.0"

        CookieHelper.enable(binding.webView)

        binding.webView.webViewClient = PortalWebViewClient()

        binding.webView.webChromeClient =
            object : WebChromeClient() {
                override fun onProgressChanged(view: WebView?, newProgress: Int) {
                    binding.progress.visibility =
                        if (newProgress in 1..99) View.VISIBLE else View.GONE
                }

                override fun onCreateWindow(
                    view: WebView?,
                    isDialog: Boolean,
                    isUserGesture: Boolean,
                    resultMsg: Message?
                ): Boolean {
                    val transport = resultMsg?.obj as? WebView.WebViewTransport ?: return false
                    val temp = WebView(this@MainActivity)
                    temp.settings.javaScriptEnabled = true
                    temp.webViewClient = PortalWebViewClient()
                    transport.webView = temp
                    resultMsg.sendToTarget()
                    return true
                }
            }

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (binding.webView.canGoBack()) {
                        binding.webView.goBack()
                    } else {
                        finish()
                    }
                }
            }
        )

        if (!Prefs.hasBaseUrl(this)) {
            openSettingsFlow(firstRun = true)
        } else {
            loadPortal()
        }
    }

    private inner class PortalWebViewClient : WebViewClient() {
        override fun shouldOverrideUrlLoading(
            view: WebView?,
            request: WebResourceRequest?
        ): Boolean {
            val uri = request?.url ?: return false
            return handleNavigation(uri)
        }

        @Deprecated("Deprecated in Java")
        override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
            if (url.isNullOrBlank()) return false
            return handleNavigation(Uri.parse(url))
        }

        override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
            pageError = false
            binding.progress.visibility = View.VISIBLE
            binding.errorOverlay.visibility = View.GONE
        }

        override fun onPageFinished(view: WebView?, url: String?) {
            binding.progress.visibility = View.GONE
            if (!pageError) {
                binding.webView.visibility = View.VISIBLE
                binding.errorOverlay.visibility = View.GONE
            }
        }

        override fun onReceivedError(
            view: WebView?,
            request: WebResourceRequest?,
            error: WebResourceError?
        ) {
            if (request?.isForMainFrame != true) return

            val desc = error?.description?.toString().orEmpty()
            val code = error?.errorCode ?: 0
            // Google Maps often redirects to intent:// / geo: — recover instead of error page.
            if (
                code == ERROR_UNSUPPORTED_SCHEME ||
                desc.contains("ERR_UNKNOWN_URL_SCHEME", ignoreCase = true) ||
                desc.contains("UNKNOWN_URL_SCHEME", ignoreCase = true)
            ) {
                val failing = request.url
                if (failing != null) {
                    handleNavigation(failing)
                }
                if (view?.canGoBack() == true) {
                    view.goBack()
                }
                return
            }

            showError(desc.ifBlank { null })
        }
    }

    /**
     * @return true if WebView should NOT load the URL itself
     */
    private fun handleNavigation(uri: Uri): Boolean {
        val scheme = uri.scheme?.lowercase().orEmpty()
        val url = uri.toString()

        when (scheme) {
            "http", "https" -> {
                if (isPortalUrl(url)) return false
                openExternal(uri)
                return true
            }
            "intent" -> {
                openIntentUri(url)
                return true
            }
            "geo", "google.navigation", "comgooglemaps", "maps", "market" -> {
                openExternal(uri)
                return true
            }
            else -> {
                if (scheme.isNotEmpty()) {
                    openExternal(uri)
                    return true
                }
                return false
            }
        }
    }

    private fun isPortalUrl(url: String): Boolean {
        val base = Prefs.getBaseUrl(this)
        if (base.isEmpty()) return false
        return try {
            val portalHost = Uri.parse(base).host?.lowercase().orEmpty()
            val targetHost = Uri.parse(url).host?.lowercase().orEmpty()
            portalHost.isNotEmpty() && portalHost == targetHost
        } catch (_: Exception) {
            false
        }
    }

    private fun openIntentUri(url: String) {
        try {
            val intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            if (intent.resolveActivity(packageManager) != null) {
                startActivity(intent)
                return
            }
            val fallback = intent.getStringExtra("browser_fallback_url")
            if (!fallback.isNullOrBlank()) {
                openExternal(Uri.parse(fallback))
                return
            }
            val pkg = intent.`package`
            if (!pkg.isNullOrBlank()) {
                openExternal(Uri.parse("market://details?id=$pkg"))
            }
        } catch (_: Exception) {
            Toast.makeText(this, R.string.external_open_failed, Toast.LENGTH_SHORT).show()
        }
    }

    private fun openExternal(uri: Uri) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(this, R.string.external_open_failed, Toast.LENGTH_SHORT).show()
        } catch (_: Exception) {
            Toast.makeText(this, R.string.external_open_failed, Toast.LENGTH_SHORT).show()
        }
    }

    private fun openSettingsFlow(firstRun: Boolean = !Prefs.hasBaseUrl(this)) {
        val intent =
            if (firstRun) {
                Intent(this, SettingsActivity::class.java).putExtra(
                    SettingsActivity.EXTRA_FIRST_RUN,
                    true
                )
            } else {
                Intent(this, PinActivity::class.java)
            }
        settingsLauncher.launch(intent)
    }

    private fun loadPortal() {
        val base = Prefs.getBaseUrl(this)
        if (base.isEmpty()) {
            openSettingsFlow(firstRun = true)
            return
        }
        pageError = false
        binding.errorOverlay.visibility = View.GONE
        binding.webView.visibility = View.VISIBLE
        binding.webView.loadUrl(base)
    }

    private fun showError(detail: String?) {
        pageError = true
        binding.progress.visibility = View.GONE
        binding.webView.visibility = View.GONE
        binding.errorOverlay.visibility = View.VISIBLE
        binding.errorMessage.text =
            if (detail.isNullOrBlank()) {
                getString(R.string.offline_message)
            } else {
                getString(R.string.offline_message) + "\n" + detail
            }
    }
}
