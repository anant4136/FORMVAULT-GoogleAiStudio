package com.formvault.android.domain.model

enum class DocumentCategory(val displayName: String, val iconName: String) {
    ALL("All", "folder"),
    ID_CARDS("ID & Identity", "badge"),
    ACADEMIC("Academic", "school"),
    EMPLOYMENT("Employment", "work"),
    PHOTOS("Photos & Portraits", "photo_camera"),
    SIGNATURES("Signatures", "draw"),
    CERTIFICATES("Certificates", "verified"),
    FINANCIAL("Financial", "account_balance");

    companion object {
        fun fromString(value: String): DocumentCategory {
            return entries.firstOrNull { it.name.equals(value, ignoreCase = true) } ?: ALL
        }
    }
}
