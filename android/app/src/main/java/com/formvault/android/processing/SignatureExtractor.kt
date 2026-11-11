package com.formvault.android.processing

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileInputStream

object SignatureExtractor {

    /**
     * Extracts a clean handwritten signature from paper photo:
     * - Thresholds paper texture to transparent alpha
     * - Enhances ink contrast to pure dark ink
     * - Saves as transparent PNG
     */
    suspend fun extractSignatureTransparentPng(
        sourceFile: File,
        threshold: Int = 180,
        darknessBoost: Float = 1.2f
    ): ByteArray = withContext(Dispatchers.Default) {
        val original = BitmapFactory.decodeStream(FileInputStream(sourceFile))
            ?: throw IllegalStateException("Failed to decode signature image")

        val width = original.width
        val height = original.height
        val outputBitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)

        val pixels = IntArray(width * height)
        original.getPixels(pixels, 0, width, 0, 0, width, height)

        for (i in pixels.indices) {
            val color = pixels[i]
            val r = Color.red(color)
            val g = Color.green(color)
            val b = Color.blue(color)

            // Calculate luminance
            val luminance = (0.299 * r + 0.587 * g + 0.114 * b).toInt()

            if (luminance > threshold) {
                // Paper background -> transparent
                pixels[i] = Color.TRANSPARENT
            } else {
                // Ink stroke -> boost ink depth and set alpha based on stroke intensity
                val alpha = ((1.0 - (luminance.toDouble() / threshold)) * 255 * darknessBoost)
                    .coerceIn(0.0, 255.0).toInt()
                pixels[i] = Color.argb(alpha, 15, 23, 42) // Slate dark ink
            }
        }

        outputBitmap.setPixels(pixels, 0, width, 0, 0, width, height)

        val stream = ByteArrayOutputStream()
        outputBitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
        val result = stream.toByteArray()

        original.recycle()
        outputBitmap.recycle()
        result
    }
}
