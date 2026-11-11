package com.formvault.android.core.util

object Constants {
    const val DATABASE_NAME = "formvault_database"
    const val PREFERENCES_NAME = "formvault_preferences"
    
    // Directory names within internal app-specific private storage
    const val DIR_ORIGINALS = "vault_originals"
    const val DIR_VERSIONS = "vault_versions"
    const val DIR_THUMBNAILS = "vault_thumbnails"
    const val DIR_TEMP = "vault_temp"

    // Supported document mime types
    val SUPPORTED_MIME_TYPES = arrayOf(
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf"
    )
}
