package com.formvault.android.processing

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.DashPathEffect
import android.graphics.Paint
import android.graphics.Rect
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.UUID

enum class SheetPageSize(val displayName: String, val widthMm: Float, val heightMm: Float) {
    PHOTO_4X6("4x6 Photo Paper (10x15 cm)", 101.6f, 152.4f),
    A4("A4 Standard (210x297 mm)", 210f, 297f),
    PHOTO_5X7("5x7 Photo Paper (13x18 cm)", 127f, 177.8f),
    US_LETTER("US Letter (8.5x11 in)", 215.9f, 279.4f)
}

data class SheetGenerateRequest(
    val pageSize: SheetPageSize = SheetPageSize.PHOTO_4X6,
    val copiesCount: Int = 6,
    val spacingMm: Float = 4f,
    val marginMm: Float = 6f,
    val dpi: Int = 300,
    val drawCutGuidelines: Boolean = true
)

object PhotoSheetGenerator {

    suspend fun generatePrintableSheet(
        context: Context,
        singlePhotoFile: File,
        request: SheetGenerateRequest
    ): File = withContext(Dispatchers.Default) {
        val sheetWidthPx = ((request.pageSize.widthMm / 25.4f) * request.dpi).toInt()
        val sheetHeightPx = ((request.pageSize.heightMm / 25.4f) * request.dpi).toInt()

        val sheetBitmap = Bitmap.createBitmap(sheetWidthPx, sheetHeightPx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(sheetBitmap)
        canvas.drawColor(Color.WHITE)

        val photoBitmap = BitmapFactory.decodeStream(FileInputStream(singlePhotoFile))
            ?: throw IllegalArgumentException("Could not decode single photo for sheet generation")

        val spacingPx = ((request.spacingMm / 25.4f) * request.dpi).toInt()
        val marginPx = ((request.marginMm / 25.4f) * request.dpi).toInt()

        val photoW = photoBitmap.width
        val photoH = photoBitmap.height

        val usableW = sheetWidthPx - (marginPx * 2)
        val usableH = sheetHeightPx - (marginPx * 2)

        val cols = (usableW + spacingPx) / (photoW + spacingPx)
        val rows = (usableH + spacingPx) / (photoH + spacingPx)

        val totalPossible = cols * rows
        val countToDraw = request.copiesCount.coerceAtMost(totalPossible)

        val borderPaint = Paint().apply {
            color = Color.LTGRAY
            style = Paint.Style.STROKE
            strokeWidth = 1.5f
            pathEffect = DashPathEffect(floatArrayOf(8f, 6f), 0f)
        }

        val photoPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

        var drawn = 0
        for (r in 0 until rows) {
            for (c in 0 until cols) {
                if (drawn >= countToDraw) break

                val x = marginPx + c * (photoW + spacingPx)
                val y = marginPx + r * (photoH + spacingPx)

                val dst = Rect(x, y, x + photoW, y + photoH)
                canvas.drawBitmap(photoBitmap, null, dst, photoPaint)

                if (request.drawCutGuidelines) {
                    canvas.drawRect(dst, borderPaint)
                }

                drawn++
            }
            if (drawn >= countToDraw) break
        }

        photoBitmap.recycle()

        val tempDir = File(context.cacheDir, "sheet_output").apply { if (!exists()) mkdirs() }
        val sheetFile = File(tempDir, "photosheet_${UUID.randomUUID()}.jpg")
        val fos = FileOutputStream(sheetFile)
        sheetBitmap.compress(Bitmap.CompressFormat.JPEG, 96, fos)
        fos.flush()
        fos.close()
        sheetBitmap.recycle()

        sheetFile
    }
}
