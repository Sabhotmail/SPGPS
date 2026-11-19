package com.spgps.app

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Bitmap
import android.os.Bundle
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
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
        settings.databaseEnabled = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
        settings.userAgentString = settings.userAgentString + " SPGPSAndroid/1.0"

        CookieHelper.enable(binding.webView)

        binding.webView.webViewClient =
            object : WebViewClient() {
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
                    if (request?.isForMainFrame == true) {
                        showError(error?.description?.toString())
                    }
                }
            }

        binding.webView.webChromeClient =
            object : WebChromeClient() {
                override fun onProgressChanged(view: WebView?, newProgress: Int) {
                    binding.progress.visibility =
                        if (newProgress in 1..99) View.VISIBLE else View.GONE
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
