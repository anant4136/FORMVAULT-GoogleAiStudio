package com.formvault.android.domain.model

data class Document(
    val id: String,
    val title: String,
    val category: DocumentCategory,
    val originalFileName: String,
    val mimeType: String,
    val fileSizeBytes: Long,
    val localFilePath: String,
    val thumbnailPath: String? = null,
    val createdAt: Long,
    val updatedAt: Long,
    val lastAccessedAt: Long,
    val notes: String = "",
    val tags: List<String> = emptyList(),
    val versionsCount: Int = 0
)

data class DocumentVersion(
    val id: String,
    val documentId: String,
    val label: String,
    val mimeType: String,
    val fileSizeBytes: Long,
    val localFilePath: String,
    val widthPx: Int? = null,
    val heightPx: Int? = null,
    val targetSpec: String? = null, // e.g. "Passport 35x45mm (<50KB)"
    val createdAt: Long
)

data class ApplicationProfile(
    val id: String,
    val title: String,
    val description: String,
    val targetOrganization: String,
    val deadline: Long? = null,
    val documentIds: List<String> = emptyList(),
    val requiredCategories: List<DocumentCategory> = emptyList(),
    val createdAt: Long
)
