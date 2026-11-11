package com.formvault.android.domain.repository

import android.net.Uri
import com.formvault.android.core.result.Resource
import com.formvault.android.domain.model.ApplicationProfile
import com.formvault.android.domain.model.Document
import com.formvault.android.domain.model.DocumentCategory
import com.formvault.android.domain.model.DocumentVersion
import kotlinx.coroutines.flow.Flow

interface DocumentRepository {
    // Document Queries
    fun getAllDocuments(): Flow<List<Document>>
    fun getDocumentsByCategory(category: DocumentCategory): Flow<List<Document>>
    fun getRecentlyAccessedDocuments(limit: Int = 5): Flow<List<Document>>
    fun searchDocuments(query: String): Flow<List<Document>>
    fun getDocumentById(documentId: String): Flow<Document?>

    // Document Operations
    suspend fun importDocument(
        sourceUri: Uri,
        title: String,
        category: DocumentCategory,
        notes: String = "",
        tags: List<String> = emptyList()
    ): Resource<Document>

    suspend fun updateDocument(document: Document): Resource<Unit>
    suspend fun deleteDocument(documentId: String): Resource<Unit>
    suspend fun recordAccess(documentId: String)

    // Version Management
    fun getDocumentVersions(documentId: String): Flow<List<DocumentVersion>>
    suspend fun addDocumentVersion(version: DocumentVersion): Resource<Unit>
    suspend fun deleteDocumentVersion(versionId: String): Resource<Unit>

    // Profiles
    fun getAllProfiles(): Flow<List<ApplicationProfile>>
    suspend fun saveProfile(profile: ApplicationProfile): Resource<Unit>
    suspend fun deleteProfile(profileId: String): Resource<Unit>

    // Storage Statistics
    suspend fun getStorageUsageBytes(): Long
}
