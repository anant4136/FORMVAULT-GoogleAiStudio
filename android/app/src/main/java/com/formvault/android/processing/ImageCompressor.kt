package com.formvault.android.processing

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.os.Build
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.UUID

enum class OutputFormat(val extension: String, val mimeType: String) {
    JPEG("jpg", "image/jpeg"),
    PNG("png", "image/png"),
    WEBP("webp", "image/webp")
}

data class CompressionRequest(
    val targetSizeBytes: Long,
    val outputFormat: OutputFormat = OutputFormat.JPEG,
    val targetWidth: Int? = null,
    val targetHeight: Int? = null,
    val maintainAspectRatio: Boolean = true,
    val rotationDegrees: Float = 0f,
    val flipHorizontal: Boolean = false,
    val minQuality: Int = 15,
    val matteColor: Int = Color.WHITE // Used when flattening transparent PNG to JPEG
)

data class CompressionResult(
    val candidateFile: File,
    val actualSizeBytes: Long,
    val originalSizeBytes: Long,
    val outputWidth: Int,
    val outputHeight: Int,
    val outputFormat: OutputFormat,
    val qualityUsed: Int,
    val isTargetMet: Boolean,
    val explanation: String? = null
)

object ImageCompressor {

    /**
     * Production iterative compression engine.
     * Iteratively searches quality and progressive dimension downsampling
     * using temporary files, never modifying the source file.
     */
    suspend fun compressImage(
        context: Context,
        sourceFile: File,
        request: CompressionRequest
    ): CompressionResult = withContext(Dispatchers.Default) {
        val originalSize = sourceFile.length()
        val tempDir = File(context.cacheDir, "compressor_candidates").apply { if (!exists()) mkdirs() }

        // Decode bounds first to verify integrity
        val boundsOptions = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeStream(FileInputStream(sourceFile), null, boundsOptions)
        val origW = boundsOptions.outWidth
        val origH = boundsOptions.outHeight

        if (origW <= 0 || origH <= 0) {
            throw IllegalArgumentException("Invalid image file or unsupported image format")
        }

        // Calculate sample size for initial decode to save RAM
        var targetW = request.targetWidth ?: origW
        var targetH = request.targetHeight ?: origH

        if (request.maintainAspectRatio) {
            if (request.targetWidth != null && request.targetHeight == null) {
                targetH = ((origH.toFloat() / origW) * targetW).toInt()
            } else if (request.targetHeight != null && request.targetWidth == null) {
                targetW = ((origW.toFloat() / origH) * targetH).toInt()
            }
        }

        var inSampleSize = 1
        while ((origW / inSampleSize) >= targetW * 2 && (origH / inSampleSize) >= targetH * 2) {
            inSampleSize *= 2
        }

        val decodeOptions = BitmapFactory.Options().apply {
            this.inSampleSize = inSampleSize
            inPreferredConfig = Bitmap.Config.ARGB_8888
        }

        var currentBitmap = BitmapFactory.decodeStream(FileInputStream(sourceFile), null, decodeOptions)
            ?: throw IllegalStateException("Failed to decode source image")

        // Apply transformations (rotation, flip, resize)
        val matrix = Matrix()
        if (request.rotationDegrees != 0f) {
            matrix.postRotate(request.rotationDegrees)
        }
        if (request.flipHorizontal) {
            matrix.postScale(-1f, 1f)
        }

        if (!matrix.isIdentity || currentBitmap.width != targetW || currentBitmap.height != targetH) {
            val scaleX = targetW.toFloat() / currentBitmap.width
            val scaleY = targetH.toFloat() / currentBitmap.height
            matrix.postScale(scaleX, scaleY)

            val transformed = Bitmap.createBitmap(
                currentBitmap, 0, 0, currentBitmap.width, currentBitmap.height, matrix, true
            )
            if (transformed != currentBitmap) {
                currentBitmap.recycle()
                currentBitmap = transformed
            }
        }

        // Handle transparency if converting to JPEG
        if (request.outputFormat == OutputFormat.JPEG && currentBitmap.hasAlpha()) {
            val flattened = Bitmap.createBitmap(currentBitmap.width, currentBitmap.height, Bitmap.Config.RGB_565)
            val canvas = Canvas(flattened)
            canvas.drawColor(request.matteColor)
            canvas.drawBitmap(currentBitmap, 0f, 0f, null)
            currentBitmap.recycle()
            currentBitmap = flattened
        }

        // Iterative candidate search
        var bestCandidateFile: File? = null
        var bestCandidateSize = Long.MAX_VALUE
        var bestQuality = 85
        var iteration = 0
        var currentW = currentBitmap.width
        var currentH = currentBitmap.height

        // Outer loop: progressive dimension reduction if needed
        while (iteration < 4) {
            // Binary search on quality for current resolution
            var lowQ = request.minQuality
            var highQ = 98

            while (lowQ <= highQ) {
                val midQ = (lowQ + highQ) / 2
                val candidateFile = File(tempDir, "cand_${UUID.randomUUID()}.${request.outputFormat.extension}")
                val stream = FileOutputStream(candidateFile)

                val format = when (request.outputFormat) {
                    OutputFormat.JPEG -> Bitmap.CompressFormat.JPEG
                    OutputFormat.PNG -> Bitmap.CompressFormat.PNG
                    OutputFormat.WEBP -> {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            Bitmap.CompressFormat.WEBP_LOSSY
                        } else {
                            @Suppress("DEPRECATION")
                            Bitmap.CompressFormat.WEBP
                        }
                    }
                }

                currentBitmap.compress(format, midQ, stream)
                stream.flush()
                stream.close()

                val fileSize = candidateFile.length()

                if (fileSize <= request.targetSizeBytes) {
                    // Fits! Keep as best candidate so far and try higher quality
                    bestCandidateFile?.delete()
                    bestCandidateFile = candidateFile
                    bestCandidateSize = fileSize
                    bestQuality = midQ
                    lowQ = midQ + 1
                } else {
                    // Too large, try lower quality
                    if (bestCandidateFile == null || fileSize < bestCandidateSize) {
                        bestCandidateFile?.delete()
                        bestCandidateFile = candidateFile
                        bestCandidateSize = fileSize
                        bestQuality = midQ
                    } else {
                        candidateFile.delete()
                    }
                    highQ = midQ - 1
                }

                // PNG ignores quality argument in standard Android
                if (request.outputFormat == OutputFormat.PNG) break
            }

            if (bestCandidateSize <= request.targetSizeBytes || currentW < 240 || currentH < 240) {
                break
            }

            // Downscale dimensions by 20% and retry
            currentW = (currentW * 0.8f).toInt()
            currentH = (currentH * 0.8f).toInt()
            val downscaled = Bitmap.createScaledBitmap(currentBitmap, currentW, currentH, true)
            if (downscaled != currentBitmap) {
                currentBitmap.recycle()
                currentBitmap = downscaled
            }
            iteration++
        }

        currentBitmap.recycle()

        val finalFile = bestCandidateFile ?: throw IllegalStateException("Compression failed to produce candidate")
        val isTargetMet = bestCandidateSize <= request.targetSizeBytes

        val explanation = if (!isTargetMet) {
            "Target size of ${request.targetSizeBytes / 1024} KB could not be reached without compromising visual legibility. Best achieved output is ${bestCandidateSize / 1024} KB at ${bestQuality}% quality."
        } else null

        CompressionResult(
            candidateFile = finalFile,
            actualSizeBytes = bestCandidateSize,
            originalSizeBytes = originalSize,
            outputWidth = currentW,
            outputHeight = currentH,
            outputFormat = request.outputFormat,
            qualityUsed = bestQuality,
            isTargetMet = isTargetMet,
            explanation = explanation
        )
    }
}
