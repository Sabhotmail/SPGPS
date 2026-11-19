package com.spgps.app

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.inputmethod.EditorInfo
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.spgps.app.databinding.ActivityPinBinding

class PinActivity : AppCompatActivity() {
    private lateinit var binding: ActivityPinBinding

    private val settingsLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            setResult(result.resultCode)
            finish()
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPinBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.toolbar.setNavigationOnClickListener { finish() }
        binding.btnUnlock.setOnClickListener { tryUnlock() }
        binding.inputPin.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_DONE) {
                tryUnlock()
                true
            } else {
                false
            }
        }
    }

    private fun tryUnlock() {
        val code = binding.inputPin.text?.toString().orEmpty()
        val secret = BuildConfig.MOBILE_SETTINGS_TOTP_SECRET
        if (Totp.verify(secret, code)) {
            binding.pinError.visibility = View.GONE
            settingsLauncher.launch(Intent(this, SettingsActivity::class.java))
        } else {
            binding.pinError.visibility = View.VISIBLE
        }
    }
}
