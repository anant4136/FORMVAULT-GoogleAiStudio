package com.formvault.android.processing

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.os.Build
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.UUID

object ImageFormatConverter {

    suspend fun convertFormat(
        context: Context,
        sourceFile: File,
        targetFormat: OutputFormat,
        quality: Int = 92,
        matteColor: Int = Color.WHITE
    ): File = withContext(Dispatchers.Default) {
        val original = BitmapFactory.decodeStream(FileInputStream(sourceFile))
            ?: throw IllegalArgumentException("Cannot decode source file for conversion")

        var bitmapToSave = original

        // If target is JPEG and source has alpha, flatten over matte color
        if (targetFormat == OutputFormat.JPEG && original.hasAlpha()) {
            val flattened = Bitmap.createBitmap(original.width, original.height, Bitmap.Config.RGB_565)
            val canvas = Canvas(flattened)
            canvas.drawColor(matteColor)
            canvas.drawBitmap(original, 0f, 0f, null)
            bitmapToSave = flattened
        }

        val tempDir = File(context.cacheDir, "format_conversions").apply { if (!exists()) mkdirs() }
        val outputFile = File(tempDir, "conv_${UUID.randomUUID()}.${targetFormat.extension}")
        val fos = FileOutputStream(outputFile)

        val compressFormat = when (targetFormat) {
            OutputFormat.JPEG -> Bitmap.CompressFormat.JPEG
            OutputFormat.PNG -> Bitmap.CompressFormat.PNG
            OutputFormat.WEBP -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    if (bitmapToSave.hasAlpha()) Bitmap.CompressFormat.WEBP_LOSSLESS else Bitmap.CompressFormat.WEBP_LOSSY
                } else {
                    @Suppress("DEPRECATION")
                    Bitmap.CompressFormat.WEBP
                }
            }
        }

        bitmapToSave.compress(compressFormat, quality, fos)
        fos.flush()
        fos.close()

        if (bitmapToSave != original) bitmapToSave.recycle()
        original.recycle()

        outputFile
    }
}
