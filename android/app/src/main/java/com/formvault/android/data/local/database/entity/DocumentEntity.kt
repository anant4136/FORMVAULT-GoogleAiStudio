package com.formvault.android.data.local.database.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import com.formvault.android.domain.model.Document
import com.formvault.android.domain.model.DocumentCategory
import com.formvault.android.domain.model.DocumentVersion

@Entity(
    tableName = "documents",
    indices = [Index(value = ["category"]), Index(value = ["lastAccessedAt"])]
)
data class DocumentEntity(
    @PrimaryKey
    val id: String,
    val title: String,
    val category: String,
    val originalFileName: String,
    val mimeType: String,
    val fileSizeBytes: Long,
    val localFilePath: String,
    val thumbnailPath: String?,
    val createdAt: Long,
    val updatedAt: Long,
    val lastAccessedAt: Long,
    val notes: String,
    val tagsCsv: String
) {
    fun toDomain(versionsCount: Int = 0): Document {
        return Document(
            id = id,
            title = title,
            category = DocumentCategory.fromString(category),
            originalFileName = originalFileName,
            mimeType = mimeType,
            fileSizeBytes = fileSizeBytes,
            localFilePath = localFilePath,
            thumbnailPath = thumbnailPath,
            createdAt = createdAt,
            updatedAt = updatedAt,
            lastAccessedAt = lastAccessedAt,
            notes = notes,
            tags = if (tagsCsv.isBlank()) emptyList() else tagsCsv.split(",").map { it.trim() },
            versionsCount = versionsCount
        )
    }

    companion object {
        fun fromDomain(doc: Document): DocumentEntity {
            return DocumentEntity(
                id = doc.id,
                title = doc.title,
                category = doc.category.name,
                originalFileName = doc.originalFileName,
                mimeType = doc.mimeType,
                fileSizeBytes = doc.fileSizeBytes,
                localFilePath = doc.localFilePath,
                thumbnailPath = doc.thumbnailPath,
                createdAt = doc.createdAt,
                updatedAt = doc.updatedAt,
                lastAccessedAt = doc.lastAccessedAt,
                notes = doc.notes,
                tagsCsv = doc.tags.joinToString(",")
            )
        }
    }
}

@Entity(
    tableName = "document_versions",
    foreignKeys = [
        ForeignKey(
            entity = DocumentEntity::class,
            parentColumns = ["id"],
            childColumns = ["documentId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["documentId"])]
)
data class DocumentVersionEntity(
    @PrimaryKey
    val id: String,
    val documentId: String,
    val label: String,
    val mimeType: String,
    val fileSizeBytes: Long,
    val localFilePath: String,
    val widthPx: Int?,
    val heightPx: Int?,
    val targetSpec: String?,
    val createdAt: Long
) {
    fun toDomain(): DocumentVersion = DocumentVersion(
        id = id,
        documentId = documentId,
        label = label,
        mimeType = mimeType,
        fileSizeBytes = fileSizeBytes,
        localFilePath = localFilePath,
        widthPx = widthPx,
        heightPx = heightPx,
        targetSpec = targetSpec,
        createdAt = createdAt
    )

    companion object {
        fun fromDomain(version: DocumentVersion): DocumentVersionEntity = DocumentVersionEntity(
            id = version.id,
            documentId = version.documentId,
            label = version.label,
            mimeType = version.mimeType,
            fileSizeBytes = version.fileSizeBytes,
            localFilePath = version.localFilePath,
            widthPx = version.widthPx,
            heightPx = version.heightPx,
            targetSpec = version.targetSpec,
            createdAt = version.createdAt
        )
    }
}
