package com.formvault.android.data.local.storage

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import com.formvault.android.core.util.Constants
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.util.UUID

class StorageManager(private val context: Context) {

    private val originalsDir: File
        get() = File(context.filesDir, Constants.DIR_ORIGINALS).apply { if (!exists()) mkdirs() }

    private val versionsDir: File
        get() = File(context.filesDir, Constants.DIR_VERSIONS).apply { if (!exists()) mkdirs() }

    private val thumbnailsDir: File
        get() = File(context.filesDir, Constants.DIR_THUMBNAILS).apply { if (!exists()) mkdirs() }

    private val tempDir: File
        get() = File(context.cacheDir, Constants.DIR_TEMP).apply { if (!exists()) mkdirs() }

    /**
     * Safely copies an external file imported via SAF into private internal storage.
     * Original files are never overwritten and stay isolated.
     */
    suspend fun saveOriginalFromUri(sourceUri: Uri): StoredFileResult = withContext(Dispatchers.IO) {
        val resolver = context.contentResolver
        val (fileName, mimeType) = resolveFileInfo(sourceUri)
        
        // Use a secure unique ID to avoid namespace collision or path traversal
        val secureFileId = UUID.randomUUID().toString()
        val extension = getExtensionFromMime(mimeType) ?: "bin"
        val destinationFile = File(originalsDir, "$secureFileId.$extension")

        // Safely write to temp first, then atomic rename
        val tempFile = File(tempDir, "tmp_${UUID.randomUUID()}.$extension")
        try {
            resolver.openInputStream(sourceUri)?.use { input ->
                FileOutputStream(tempFile).use { output ->
                    input.copyTo(output)
                }
            } ?: throw IllegalStateException("Cannot read source URI: $sourceUri")

            if (!tempFile.renameTo(destinationFile)) {
                // Fallback copy if atomic rename fails across partitions
                tempFile.copyTo(destinationFile, overwrite = false)
                tempFile.delete()
            }

            StoredFileResult(
                storedFilePath = destinationFile.absolutePath,
                originalName = fileName,
                mimeType = mimeType,
                fileSizeBytes = destinationFile.length()
            )
        } catch (e: Exception) {
            tempFile.delete()
            throw e
        }
    }

    /**
     * Saves a newly generated version (compressed photo, extracted signature, or PDF).
     */
    suspend fun saveVersionBytes(
        bytes: ByteArray,
        documentId: String,
        extension: String
    ): File = withContext(Dispatchers.IO) {
        val versionFile = File(versionsDir, "ver_${documentId}_${UUID.randomUUID()}.$extension")
        FileOutputStream(versionFile).use { it.write(bytes) }
        versionFile
    }

    /**
     * Safely deletes an original file and all associated versions/thumbnails.
     */
    suspend fun deleteFileQuietly(filePath: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val file = File(filePath)
            // Safety check: ensure file is inside app filesDir or cacheDir
            if (file.canonicalPath.startsWith(context.filesDir.canonicalPath) ||
                file.canonicalPath.startsWith(context.cacheDir.canonicalPath)
            ) {
                if (file.exists()) file.delete() else true
            } else {
                false
            }
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Calculates current storage usage in bytes for FormVault private data.
     */
    suspend fun calculateTotalStorageBytes(): Long = withContext(Dispatchers.IO) {
        val totalOriginals = getDirectorySize(originalsDir)
        val totalVersions = getDirectorySize(versionsDir)
        val totalThumbnails = getDirectorySize(thumbnailsDir)
        totalOriginals + totalVersions + totalThumbnails
    }

    /**
     * Clears temporary and cached processing files.
     */
    suspend fun clearTempFiles() = withContext(Dispatchers.IO) {
        tempDir.deleteRecursively()
        tempDir.mkdirs()
    }

    private fun getDirectorySize(directory: File): Long {
        if (!directory.exists()) return 0L
        return directory.walkTopDown().filter { it.isFile }.map { it.length() }.sum()
    }

    private fun resolveFileInfo(uri: Uri): Pair<String, String> {
        var name = "document_${System.currentTimeMillis()}"
        val mime = context.contentResolver.getType(uri) ?: "application/octet-stream"
        
        context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
                val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (nameIndex != -1) {
                    name = cursor.getString(nameIndex) ?: name
                }
            }
        }
        return Pair(name, mime)
    }

    private fun getExtensionFromMime(mimeType: String): String? {
        return when (mimeType) {
            "image/jpeg" -> "jpg"
            "image/png" -> "png"
            "image/webp" -> "webp"
            "application/pdf" -> "pdf"
            else -> null
        }
    }
}

data class StoredFileResult(
    val storedFilePath: String,
    val originalName: String,
    val mimeType: String,
    val fileSizeBytes: Long
)
