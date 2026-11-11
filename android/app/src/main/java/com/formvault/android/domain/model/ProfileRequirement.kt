package com.formvault.android.domain.model

data class ProfileRequirement(
    val id: String,
    val name: String,
    val category: DocumentCategory,
    val assignedDocumentId: String? = null,
    val minSizeBytes: Long? = null,
    val maxSizeBytes: Long? = null,
    val allowedFormats: List<String> = listOf("image/jpeg", "image/png", "application/pdf"),
    val requiredWidthPx: Int? = null,
    val requiredHeightPx: Int? = null,
    val minWidthPx: Int? = null,
    val minHeightPx: Int? = null,
    val maxWidthPx: Int? = null,
    val maxHeightPx: Int? = null,
    val pageCount: Int? = null,
    val notes: String = ""
)

data class PreparedDocumentResult(
    val requirementId: String,
    val requirementName: String,
    val sourceDocumentId: String,
    val outputFileName: String,
    val outputMimeType: String,
    val outputSizeBytes: Long,
    val outputFilePath: String,
    val outputWidthPx: Int? = null,
    val outputHeightPx: Int? = null,
    val transformationsApplied: List<String>,
    val warnings: List<String>,
    val isCompliant: Boolean
)

data class PreparationPackageResult(
    val profileId: String,
    val profileTitle: String,
    val targetOrganization: String,
    val preparedItems: List<PreparedDocumentResult>,
    val zipPackagePath: String,
    val auditReportText: String,
    val allValid: Boolean,
    val totalSizeBytes: Long,
    val generatedAt: Long
)
