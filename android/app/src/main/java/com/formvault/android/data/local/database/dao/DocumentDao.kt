package com.formvault.android.data.local.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import com.formvault.android.data.local.database.entity.DocumentEntity
import com.formvault.android.data.local.database.entity.DocumentVersionEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface DocumentDao {

    @Query("SELECT * FROM documents ORDER BY updatedAt DESC")
    fun getAllDocuments(): Flow<List<DocumentEntity>>

    @Query("SELECT * FROM documents WHERE category = :category ORDER BY updatedAt DESC")
    fun getDocumentsByCategory(category: String): Flow<List<DocumentEntity>>

    @Query("SELECT * FROM documents ORDER BY lastAccessedAt DESC LIMIT :limit")
    fun getRecentlyAccessedDocuments(limit: Int): Flow<List<DocumentEntity>>

    @Query("SELECT * FROM documents WHERE title LIKE '%' || :query || '%' OR notes LIKE '%' || :query || '%' OR tagsCsv LIKE '%' || :query || '%' ORDER BY updatedAt DESC")
    fun searchDocuments(query: String): Flow<List<DocumentEntity>>

    @Query("SELECT * FROM documents WHERE id = :documentId LIMIT 1")
    fun getDocumentById(documentId: String): Flow<DocumentEntity?>

    @Query("SELECT * FROM documents WHERE id = :documentId LIMIT 1")
    suspend fun getDocumentByIdSync(documentId: String): DocumentEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDocument(document: DocumentEntity)

    @Update
    suspend fun updateDocument(document: DocumentEntity)

    @Query("UPDATE documents SET lastAccessedAt = :timestamp WHERE id = :documentId")
    suspend fun updateLastAccessed(documentId: String, timestamp: Long)

    @Query("DELETE FROM documents WHERE id = :documentId")
    suspend fun deleteDocument(documentId: String)

    // Versions
    @Query("SELECT * FROM document_versions WHERE documentId = :documentId ORDER BY createdAt DESC")
    fun getVersionsForDocument(documentId: String): Flow<List<DocumentVersionEntity>>

    @Query("SELECT * FROM document_versions WHERE documentId = :documentId")
    suspend fun getVersionsForDocumentSync(documentId: String): List<DocumentVersionEntity>

    @Query("SELECT COUNT(*) FROM document_versions WHERE documentId = :documentId")
    suspend fun getVersionCount(documentId: String): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertVersion(version: DocumentVersionEntity)

    @Query("DELETE FROM document_versions WHERE id = :versionId")
    suspend fun deleteVersion(versionId: String)
}
