package com.formvault.android.ads

/**
 * Clean architectural abstraction for monetization/ads.
 * In accordance with FormVault principles, FormVault is 100% offline, privacy-first,
 * with no external tracking or advertising SDKs.
 */
interface AdsProvider {
    val isAdsEnabled: Boolean
    fun initialize()
    fun showInterstitial(onDismissed: () -> Unit)
}

class NoAdsProvider : AdsProvider {
    override val isAdsEnabled: Boolean = false

    override fun initialize() {
        // No-op: No advertising SDKs are loaded or referenced
    }

    override fun showInterstitial(onDismissed: () -> Unit) {
        // Immediately bypass without showing any ads
        onDismissed()
    }
}
