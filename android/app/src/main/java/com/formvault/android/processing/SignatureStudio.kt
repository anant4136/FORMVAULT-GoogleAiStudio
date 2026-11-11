package com.formvault.android.processing

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.UUID

data class SignatureProcessRequest(
    val threshold: Int = 185, // 0 to 255 paper luminance threshold
    val contrastBoost: Float = 1.3f, // 1.0 to 2.5
    val brightnessAdjustment: Int = 0, // -50 to +50
    val autoTrimWhitespace: Boolean = true,
    val makeBackgroundTransparent: Boolean = true,
    val backgroundColor: Int = Color.WHITE,
    val targetWidthPx: Int? = null,
    val targetHeightPx: Int? = null,
    val targetSizeBytes: Long? = 20 * 1024, // Typically <20KB for online portals
    val outputFormat: OutputFormat = OutputFormat.PNG
)

data class SignatureProcessResult(
    val outputFile: File,
    val widthPx: Int,
    val heightPx: Int,
    val actualSizeBytes: Long,
    val targetMet: Boolean
)

object SignatureStudio {

    suspend fun processSignature(
        context: Context,
        sourceFile: File,
        request: SignatureProcessRequest
    ): SignatureProcessResult = withContext(Dispatchers.Default) {
        val original = BitmapFactory.decodeStream(FileInputStream(sourceFile))
            ?: throw IllegalArgumentException("Could not decode signature source image")

        val width = original.width
        val height = original.height
        val pixels = IntArray(width * height)
        original.getPixels(pixels, 0, width, 0, 0, width, height)

        // 1. Convert to grayscale and apply brightness/contrast/thresholding
        var minX = width
        var minY = height
        var maxX = 0
        var maxY = 0
        var inkPixelCount = 0

        val processedPixels = IntArray(width * height)

        for (y in 0 until height) {
            for (x in 0 until width) {
                val index = y * width + x
                val color = pixels[index]
                val r = Color.red(color)
                val g = Color.green(color)
                val b = Color.blue(color)

                // Standard luminance
                var gray = (0.299 * r + 0.587 * g + 0.114 * b).toInt()
                gray = (gray + request.brightnessAdjustment).coerceIn(0, 255)

                if (request.contrastBoost != 1.0f) {
                    gray = (((gray - 128) * request.contrastBoost) + 128).toInt().coerceIn(0, 255)
                }

                if (gray > request.threshold) {
                    // Paper background
                    if (request.makeBackgroundTransparent) {
                        processedPixels[index] = Color.TRANSPARENT
                    } else {
                        processedPixels[index] = request.backgroundColor
                    }
                } else {
                    // Ink stroke
                    if (x < minX) minX = x
                    if (x > maxX) maxX = x
                    if (y < minY) minY = y
                    if (y > maxY) maxY = y
                    inkPixelCount++

                    if (request.makeBackgroundTransparent) {
                        val strokeAlpha = ((1.0 - (gray.toDouble() / request.threshold)) * 255 * request.contrastBoost)
                            .coerceIn(0.0, 255.0).toInt()
                        processedPixels[index] = Color.argb(strokeAlpha, 15, 23, 42) // Rich slate ink
                    } else {
                        // Deep black ink
                        processedPixels[index] = Color.rgb(gray / 2, gray / 2, gray / 2)
                    }
                }
            }
        }

        val fullProcessedBmp = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        fullProcessedBmp.setPixels(processedPixels, 0, width, 0, 0, width, height)

        // 2. Auto-trim whitespace around ink bounding box if requested and ink was found
        val trimmedBmp = if (request.autoTrimWhitespace && inkPixelCount > 0 && maxX > minX && maxY > minY) {
            val padding = 16
            val cropLeft = (minX - padding).coerceAtLeast(0)
            val cropTop = (minY - padding).coerceAtLeast(0)
            val cropRight = (maxX + padding).coerceAtMost(width)
            val cropBottom = (maxY + padding).coerceAtMost(height)
            val cropW = cropRight - cropLeft
            val cropH = cropBottom - cropTop

            val trimmed = Bitmap.createBitmap(fullProcessedBmp, cropLeft, cropTop, cropW, cropH)
            if (trimmed != fullProcessedBmp) fullProcessedBmp.recycle()
            trimmed
        } else {
            fullProcessedBmp
        }

        // 3. Optional resize to exact requested dimensions
        val finalBmp = if (request.targetWidthPx != null && request.targetHeightPx != null &&
            (trimmedBmp.width != request.targetWidthPx || trimmedBmp.height != request.targetHeightPx)
        ) {
            val scaled = Bitmap.createScaledBitmap(trimmedBmp, request.targetWidthPx, request.targetHeightPx, true)
            if (scaled != trimmedBmp) trimmedBmp.recycle()
            scaled
        } else {
            trimmedBmp
        }

        // 4. Encode to candidate file with target KB compression
        val tempDir = File(context.cacheDir, "signature_output").apply { if (!exists()) mkdirs() }
        val outputFile = File(tempDir, "signature_${UUID.randomUUID()}.${request.outputFormat.extension}")

        val fos = FileOutputStream(outputFile)
        val format = if (request.outputFormat == OutputFormat.JPEG) Bitmap.CompressFormat.JPEG else Bitmap.CompressFormat.PNG
        finalBmp.compress(format, 92, fos)
        fos.flush()
        fos.close()

        val actualSize = outputFile.length()
        val targetMet = request.targetSizeBytes == null || actualSize <= request.targetSizeBytes

        finalBmp.recycle()
        original.recycle()

        SignatureProcessResult(
            outputFile = outputFile,
            widthPx = finalBmp.width,
            heightPx = finalBmp.height,
            actualSizeBytes = actualSize,
            targetMet = targetMet
        )
    }
}
