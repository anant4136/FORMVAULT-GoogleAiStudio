package com.formvault.android.data.repository

import android.net.Uri
import com.formvault.android.core.result.Resource
import com.formvault.android.data.local.database.dao.DocumentDao
import com.formvault.android.data.local.database.dao.ProfileDao
import com.formvault.android.data.local.database.entity.DocumentEntity
import com.formvault.android.data.local.database.entity.DocumentVersionEntity
import com.formvault.android.data.local.database.entity.ProfileEntity
import com.formvault.android.data.local.storage.StorageManager
import com.formvault.android.domain.model.ApplicationProfile
import com.formvault.android.domain.model.Document
import com.formvault.android.domain.model.DocumentCategory
import com.formvault.android.domain.model.DocumentVersion
import com.formvault.android.domain.repository.DocumentRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.util.UUID

class OfflineDocumentRepository(
    private val documentDao: DocumentDao,
    private val profileDao: ProfileDao,
    private val storageManager: StorageManager
) : DocumentRepository {

    override fun getAllDocuments(): Flow<List<Document>> {
        return documentDao.getAllDocuments().map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override fun getDocumentsByCategory(category: DocumentCategory): Flow<List<Document>> {
        return if (category == DocumentCategory.ALL) {
            getAllDocuments()
        } else {
            documentDao.getDocumentsByCategory(category.name).map { entities ->
                entities.map { it.toDomain() }
            }
        }
    }

    override fun getRecentlyAccessedDocuments(limit: Int): Flow<List<Document>> {
        return documentDao.getRecentlyAccessedDocuments(limit).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override fun searchDocuments(query: String): Flow<List<Document>> {
        return documentDao.searchDocuments(query.trim()).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override fun getDocumentById(documentId: String): Flow<Document?> {
        return documentDao.getDocumentById(documentId).map { it?.toDomain() }
    }

    override suspend fun importDocument(
        sourceUri: Uri,
        title: String,
        category: DocumentCategory,
        notes: String,
        tags: List<String>
    ): Resource<Document> {
        return try {
            val storedResult = storageManager.saveOriginalFromUri(sourceUri)
            val now = System.currentTimeMillis()
            val documentId = UUID.randomUUID().toString()

            val entity = DocumentEntity(
                id = documentId,
                title = title.ifBlank { storedResult.originalName },
                category = category.name,
                originalFileName = storedResult.originalName,
                mimeType = storedResult.mimeType,
                fileSizeBytes = storedResult.fileSizeBytes,
                localFilePath = storedResult.storedFilePath,
                thumbnailPath = null,
                createdAt = now,
                updatedAt = now,
                lastAccessedAt = now,
                notes = notes,
                tagsCsv = tags.joinToString(",")
            )

            documentDao.insertDocument(entity)
            Resource.Success(entity.toDomain())
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Failed to import document to local vault", e)
        }
    }

    override suspend fun updateDocument(document: Document): Resource<Unit> {
        return try {
            val updated = document.copy(updatedAt = System.currentTimeMillis())
            documentDao.updateDocument(DocumentEntity.fromDomain(updated))
            Resource.Success(Unit)
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Failed to update document metadata", e)
        }
    }

    override suspend fun deleteDocument(documentId: String): Resource<Unit> {
        return try {
            val document = documentDao.getDocumentByIdSync(documentId)
            if (document != null) {
                // Delete physical files safely
                storageManager.deleteFileQuietly(document.localFilePath)
                document.thumbnailPath?.let { storageManager.deleteFileQuietly(it) }

                // Delete associated versions physical files
                val versions = documentDao.getVersionsForDocumentSync(documentId)
                for (version in versions) {
                    storageManager.deleteFileQuietly(version.localFilePath)
                }

                // Delete database record (cascades to document_versions)
                documentDao.deleteDocument(documentId)
            }
            Resource.Success(Unit)
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Failed to safely delete document", e)
        }
    }

    override suspend fun recordAccess(documentId: String) {
        documentDao.updateLastAccessed(documentId, System.currentTimeMillis())
    }

    override fun getDocumentVersions(documentId: String): Flow<List<DocumentVersion>> {
        return documentDao.getVersionsForDocument(documentId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override suspend fun addDocumentVersion(version: DocumentVersion): Resource<Unit> {
        return try {
            documentDao.insertVersion(DocumentVersionEntity.fromDomain(version))
            Resource.Success(Unit)
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Failed to record document version", e)
        }
    }

    override suspend fun deleteDocumentVersion(versionId: String): Resource<Unit> {
        return try {
            documentDao.deleteVersion(versionId)
            Resource.Success(Unit)
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Failed to delete document version", e)
        }
    }

    override fun getAllProfiles(): Flow<List<ApplicationProfile>> {
        return profileDao.getAllProfiles().map { entities ->
            entities.map { it.toDomain() }
        }
    }

    override suspend fun saveProfile(profile: ApplicationProfile): Resource<Unit> {
        return try {
            profileDao.insertProfile(ProfileEntity.fromDomain(profile))
            Resource.Success(Unit)
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Failed to save application profile", e)
        }
    }

    override suspend fun deleteProfile(profileId: String): Resource<Unit> {
        return try {
            profileDao.deleteProfile(profileId)
            Resource.Success(Unit)
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Failed to delete profile", e)
        }
    }

    override suspend fun getStorageUsageBytes(): Long {
        return storageManager.calculateTotalStorageBytes()
    }
}
