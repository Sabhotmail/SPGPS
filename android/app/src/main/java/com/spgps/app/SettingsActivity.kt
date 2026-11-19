package com.spgps.app

import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.spgps.app.databinding.ActivitySettingsBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

class SettingsActivity : AppCompatActivity() {
    companion object {
        const val EXTRA_FIRST_RUN = "first_run"
    }

    private lateinit var binding: ActivitySettingsBinding
    private var firstRun = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        firstRun = intent.getBooleanExtra(EXTRA_FIRST_RUN, false)
        binding.firstRunHelp.visibility = if (firstRun) View.VISIBLE else View.GONE
        binding.inputUrl.setText(Prefs.getBaseUrl(this))

        binding.toolbar.setNavigationOnClickListener { attemptLeave() }

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    attemptLeave()
                }
            }
        )

        binding.btnTest.setOnClickListener { testConnection() }
        binding.btnSave.setOnClickListener { save() }
    }

    private fun attemptLeave() {
        if (firstRun && !Prefs.hasBaseUrl(this)) {
            Toast.makeText(this, R.string.settings_url_required, Toast.LENGTH_SHORT).show()
        } else {
            finish()
        }
    }

    private fun save() {
        val raw = binding.inputUrl.text?.toString().orEmpty()
        if (raw.isBlank()) {
            Toast.makeText(this, R.string.settings_url_required, Toast.LENGTH_SHORT).show()
            return
        }
        if (!Prefs.isValidHttpUrl(raw)) {
            Toast.makeText(this, R.string.settings_url_invalid, Toast.LENGTH_SHORT).show()
            return
        }
        Prefs.setBaseUrl(this, raw)
        Toast.makeText(this, R.string.settings_saved, Toast.LENGTH_SHORT).show()
        setResult(RESULT_OK)
        finish()
    }

    private fun testConnection() {
        val raw = binding.inputUrl.text?.toString().orEmpty()
        if (!Prefs.isValidHttpUrl(raw)) {
            Toast.makeText(this, R.string.settings_url_invalid, Toast.LENGTH_SHORT).show()
            return
        }
        val url = Prefs.normalizeUrl(raw)
        binding.btnTest.isEnabled = false
        binding.testResult.visibility = View.VISIBLE
        binding.testResult.text = "…"

        lifecycleScope.launch {
            val result =
                withContext(Dispatchers.IO) {
                    runCatching {
                        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
                            connectTimeout = 8000
                            readTimeout = 8000
                            instanceFollowRedirects = true
                            requestMethod = "GET"
                        }
                        try {
                            val code = conn.responseCode
                            getString(R.string.test_ok, code)
                        } finally {
                            conn.disconnect()
                        }
                    }.getOrElse {
                        getString(R.string.test_fail, it.message ?: it.javaClass.simpleName)
                    }
                }
            binding.testResult.text = result
            binding.btnTest.isEnabled = true
        }
    }
}
