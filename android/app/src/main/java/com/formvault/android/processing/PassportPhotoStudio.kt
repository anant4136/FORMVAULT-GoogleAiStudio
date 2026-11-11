package com.formvault.android.processing

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.UUID

data class PassportSpec(
    val name: String,
    val widthMm: Float,
    val heightMm: Float,
    val description: String
)

val COMMON_PASSPORT_SPECS = listOf(
    PassportSpec("India / UK / Europe (35x45 mm)", 35f, 45f, "Standard Schengen, UK, India passport & visa"),
    PassportSpec("US Visa / Passport (2x2 in / 51x51 mm)", 50.8f, 50.8f, "United States, India OCI square 2x2 inch"),
    PassportSpec("European ID / Schengen (35x45 mm)", 35f, 45f, "Standard biometric identity"),
    PassportSpec("Small ID / Driving Licence (30x40 mm)", 30f, 40f, "European / Asian regional ID card"),
    PassportSpec("Custom Dimensions", 35f, 45f, "User configurable width & height")
)

data class PassportProcessRequest(
    val widthMm: Float,
    val heightMm: Float,
    val dpi: Int = 300,
    val backgroundColor: Int = Color.WHITE,
    val cropRectNormalized: RectF? = null, // [0f, 0f, 1f, 1f]
    val rotationAngle: Float = 0f,
    val targetSizeBytes: Long? = 50 * 1024, // Optional target KB compression
    val outputFormat: OutputFormat = OutputFormat.JPEG
)

data class PassportProcessResult(
    val outputFile: File,
    val widthPx: Int,
    val heightPx: Int,
    val actualSizeBytes: Long,
    val targetMet: Boolean
)

object PassportPhotoStudio {

    fun mmToPixels(mm: Float, dpi: Int = 300): Int {
        // 1 inch = 25.4 mm
        return ((mm / 25.4f) * dpi).toInt()
    }

    suspend fun processPassportPhoto(
        context: Context,
        sourceFile: File,
        request: PassportProcessRequest
    ): PassportProcessResult = withContext(Dispatchers.Default) {
        val targetWidthPx = mmToPixels(request.widthMm, request.dpi)
        val targetHeightPx = mmToPixels(request.heightMm, request.dpi)

        val original = BitmapFactory.decodeStream(FileInputStream(sourceFile))
            ?: throw IllegalArgumentException("Could not decode source photo for passport generation")

        // 1. Apply rotation if needed
        val rotated = if (request.rotationAngle != 0f) {
            val matrix = Matrix().apply { postRotate(request.rotationAngle) }
            val rotBmp = Bitmap.createBitmap(original, 0, 0, original.width, original.height, matrix, true)
            if (rotBmp != original) original.recycle()
            rotBmp
        } else {
            original
        }

        // 2. Crop to user defined normalized crop rect or center-fit target aspect ratio
        val targetAspect = targetWidthPx.toFloat() / targetHeightPx.toFloat()
        val cropRect = if (request.cropRectNormalized != null) {
            Rect(
                (request.cropRectNormalized.left * rotated.width).toInt().coerceIn(0, rotated.width - 1),
                (request.cropRectNormalized.top * rotated.height).toInt().coerceIn(0, rotated.height - 1),
                (request.cropRectNormalized.right * rotated.width).toInt().coerceIn(1, rotated.width),
                (request.cropRectNormalized.bottom * rotated.height).toInt().coerceIn(1, rotated.height)
            )
        } else {
            val srcAspect = rotated.width.toFloat() / rotated.height.toFloat()
            if (srcAspect > targetAspect) {
                val cropW = (rotated.height * targetAspect).toInt()
                val left = (rotated.width - cropW) / 2
                Rect(left, 0, left + cropW, rotated.height)
            } else {
                val cropH = (rotated.width / targetAspect).toInt()
                val top = (rotated.height - cropH) / 2
                Rect(0, top, rotated.width, top + cropH)
            }
        }

        val croppedBitmap = Bitmap.createBitmap(
            rotated,
            cropRect.left,
            cropRect.top,
            cropRect.width(),
            cropRect.height()
        )

        // 3. Create canvas with requested background color and draw scaled headshot
        val outputBitmap = Bitmap.createBitmap(targetWidthPx, targetHeightPx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(outputBitmap)
        canvas.drawColor(request.backgroundColor)

        val srcRect = Rect(0, 0, croppedBitmap.width, croppedBitmap.height)
        val dstRect = Rect(0, 0, targetWidthPx, targetHeightPx)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
        canvas.drawBitmap(croppedBitmap, srcRect, dstRect, paint)

        // 4. Compress to target file size or high-res standard
        val tempDir = File(context.cacheDir, "passport_output").apply { if (!exists()) mkdirs() }
        val outputFile = File(tempDir, "passport_${UUID.randomUUID()}.${request.outputFormat.extension}")

        var quality = 95
        var targetMet = true

        if (request.targetSizeBytes != null && request.targetSizeBytes > 0) {
            var low = 20
            var high = 98
            var bestCandidateFile: File? = null
            var bestSize = Long.MAX_VALUE

            while (low <= high) {
                val mid = (low + high) / 2
                val testFile = File(tempDir, "cand_${UUID.randomUUID()}.${request.outputFormat.extension}")
                val fos = FileOutputStream(testFile)
                outputBitmap.compress(
                    if (request.outputFormat == OutputFormat.PNG) Bitmap.CompressFormat.PNG else Bitmap.CompressFormat.JPEG,
                    mid,
                    fos
                )
                fos.flush()
                fos.close()

                val len = testFile.length()
                if (len <= request.targetSizeBytes) {
                    bestCandidateFile?.delete()
                    bestCandidateFile = testFile
                    bestSize = len
                    quality = mid
                    low = mid + 1
                } else {
                    if (bestCandidateFile == null || len < bestSize) {
                        bestCandidateFile?.delete()
                        bestCandidateFile = testFile
                        bestSize = len
                        quality = mid
                    } else {
                        testFile.delete()
                    }
                    high = mid - 1
                }
            }

            bestCandidateFile?.renameTo(outputFile)
            targetMet = outputFile.length() <= request.targetSizeBytes
        } else {
            val fos = FileOutputStream(outputFile)
            outputBitmap.compress(
                if (request.outputFormat == OutputFormat.PNG) Bitmap.CompressFormat.PNG else Bitmap.CompressFormat.JPEG,
                quality,
                fos
            )
            fos.flush()
            fos.close()
        }

        croppedBitmap.recycle()
        if (rotated != original) rotated.recycle()
        original.recycle()
        outputBitmap.recycle()

        PassportProcessResult(
            outputFile = outputFile,
            widthPx = targetWidthPx,
            heightPx = targetHeightPx,
            actualSizeBytes = outputFile.length(),
            targetMet = targetMet
        )
    }
}
