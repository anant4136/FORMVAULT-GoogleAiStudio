package com.formvault.android.processing

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Rect
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.UUID

data class ResizeOptions(
    val width: Int,
    val height: Int,
    val maintainAspectRatio: Boolean = true,
    val rotationAngle: Float = 0f,
    val flipHorizontal: Boolean = false,
    val cropRect: Rect? = null,
    val outputFormat: OutputFormat = OutputFormat.JPEG,
    val quality: Int = 90
)

object ImageResizer {

    suspend fun resizeAndTransform(
        context: Context,
        sourceFile: File,
        options: ResizeOptions
    ): File = withContext(Dispatchers.Default) {
        val original = BitmapFactory.decodeStream(FileInputStream(sourceFile))
            ?: throw IllegalArgumentException("Could not decode image for resizing")

        // 1. Cropping if requested
        val cropped = if (options.cropRect != null) {
            val r = options.cropRect
            val safeLeft = r.left.coerceIn(0, original.width - 1)
            val safeTop = r.top.coerceIn(0, original.height - 1)
            val safeWidth = r.width().coerceIn(1, original.width - safeLeft)
            val safeHeight = r.height().coerceIn(1, original.height - safeTop)
            Bitmap.createBitmap(original, safeLeft, safeTop, safeWidth, safeHeight)
        } else {
            original
        }

        // 2. Compute final dimensions
        var targetW = options.width
        var targetH = options.height
        if (options.maintainAspectRatio) {
            val ratio = cropped.width.toFloat() / cropped.height.toFloat()
            if (targetW > 0 && targetH <= 0) {
                targetH = (targetW / ratio).toInt()
            } else if (targetH > 0 && targetW <= 0) {
                targetW = (targetH * ratio).toInt()
            }
        }

        // 3. Scale, Rotate, and Flip using Matrix
        val matrix = Matrix()
        if (options.rotationAngle != 0f) {
            matrix.postRotate(options.rotationAngle)
        }
        if (options.flipHorizontal) {
            matrix.postScale(-1f, 1f)
        }
        val scaleX = targetW.toFloat() / cropped.width
        val scaleY = targetH.toFloat() / cropped.height
        matrix.postScale(scaleX, scaleY)

        val transformed = Bitmap.createBitmap(
            cropped, 0, 0, cropped.width, cropped.height, matrix, true
        )

        // 4. Save to temporary candidate file
        val tempDir = File(context.cacheDir, "resizer_output").apply { if (!exists()) mkdirs() }
        val outputFile = File(tempDir, "resized_${UUID.randomUUID()}.${options.outputFormat.extension}")
        val fos = FileOutputStream(outputFile)

        val compressFormat = when (options.outputFormat) {
            OutputFormat.JPEG -> Bitmap.CompressFormat.JPEG
            OutputFormat.PNG -> Bitmap.CompressFormat.PNG
            OutputFormat.WEBP -> Bitmap.CompressFormat.WEBP
        }

        transformed.compress(compressFormat, options.quality, fos)
        fos.flush()
        fos.close()

        if (cropped != original) cropped.recycle()
        original.recycle()
        transformed.recycle()

        outputFile
    }
}
