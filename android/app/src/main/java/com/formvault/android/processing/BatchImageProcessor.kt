package com.formvault.android.processing

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import java.io.File

data class BatchItemResult(
    val fileIndex: Int,
    val sourceFile: File,
    val result: CompressionResult?,
    val isSuccess: Boolean,
    val errorMessage: String? = null
)

data class BatchProgress(
    val totalCount: Int,
    val completedCount: Int,
    val currentFileName: String,
    val progressPercentage: Float,
    val currentItemResult: BatchItemResult? = null
)

object BatchImageProcessor {

    /**
     * Executes non-blocking batch processing of multiple images using Kotlin Coroutines Flow.
     * Reports real-time individual progress and failures without blocking the main UI thread.
     */
    fun processBatch(
        context: Context,
        sourceFiles: List<File>,
        sharedRequest: CompressionRequest
    ): Flow<BatchProgress> = flow {
        val total = sourceFiles.size
        var completed = 0

        sourceFiles.forEachIndexed { index, file ->
            val fileName = file.name
            emit(
                BatchProgress(
                    totalCount = total,
                    completedCount = completed,
                    currentFileName = fileName,
                    progressPercentage = if (total > 0) (completed.toFloat() / total) * 100f else 0f,
                    currentItemResult = null
                )
            )

            val itemResult = try {
                val res = ImageCompressor.compressImage(context, file, sharedRequest)
                BatchItemResult(
                    fileIndex = index,
                    sourceFile = file,
                    result = res,
                    isSuccess = true
                )
            } catch (e: Exception) {
                BatchItemResult(
                    fileIndex = index,
                    sourceFile = file,
                    result = null,
                    isSuccess = false,
                    errorMessage = e.localizedMessage ?: "Processing error"
                )
            }

            completed++
            emit(
                BatchProgress(
                    totalCount = total,
                    completedCount = completed,
                    currentFileName = fileName,
                    progressPercentage = (completed.toFloat() / total) * 100f,
                    currentItemResult = itemResult
                )
            )
        }
    }.flowOn(Dispatchers.Default)
}
