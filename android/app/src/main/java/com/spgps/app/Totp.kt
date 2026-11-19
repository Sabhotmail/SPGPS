package com.spgps.app

import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import kotlin.math.pow

/**
 * RFC 6238 TOTP (HMAC-SHA1, 30s, 6 digits) matching src/lib/totp.ts
 * Secret is UTF-8 key material (same as MOBILE_SETTINGS_TOTP_SECRET).
 */
object Totp {
    private const val PERIOD_SECONDS = 30
    private const val DIGITS = 6

    fun generate(
        secret: String,
        atMs: Long = System.currentTimeMillis()
    ): String {
        val counter = atMs / (PERIOD_SECONDS * 1000L)
        return hotp(secret.toByteArray(Charsets.UTF_8), counter)
    }

    fun verify(
        secret: String,
        code: String,
        atMs: Long = System.currentTimeMillis(),
        window: Int = 1
    ): Boolean {
        val normalized = code.replace("\\s".toRegex(), "")
        if (!normalized.matches(Regex("^\\d{6}$"))) return false

        val counter = atMs / (PERIOD_SECONDS * 1000L)
        val key = secret.toByteArray(Charsets.UTF_8)
        for (w in -window..window) {
            if (hotp(key, counter + w) == normalized) return true
        }
        return false
    }

    private fun hotp(secret: ByteArray, counter: Long): String {
        val counterBytes = ByteArray(8)
        var value = counter
        for (i in 7 downTo 0) {
            counterBytes[i] = (value and 0xff).toByte()
            value = value ushr 8
        }

        val mac = Mac.getInstance("HmacSHA1")
        mac.init(SecretKeySpec(secret, "HmacSHA1"))
        val hash = mac.doFinal(counterBytes)

        val offset = hash[hash.size - 1].toInt() and 0x0f
        val binary =
            ((hash[offset].toInt() and 0x7f) shl 24) or
                ((hash[offset + 1].toInt() and 0xff) shl 16) or
                ((hash[offset + 2].toInt() and 0xff) shl 8) or
                (hash[offset + 3].toInt() and 0xff)

        val otp = binary % 10.0.pow(DIGITS).toInt()
        return otp.toString().padStart(DIGITS, '0')
    }
}
