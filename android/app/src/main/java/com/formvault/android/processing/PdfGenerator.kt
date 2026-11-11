package com.formvault.android.processing

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Rect
import android.graphics.pdf.PdfDocument
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileInputStream

object PdfGenerator {

    /**
     * Converts one or more image files into a standard A4 formatted PDF document
     * completely offline using Android native PdfDocument API.
     */
    suspend fun createPdfFromImages(
        imageFiles: List<File>,
        pageWidth: Int = 595, // Standard A4 points (72 dpi)
        pageHeight: Int = 842
    ): ByteArray = withContext(Dispatchers.Default) {
        val pdfDocument = PdfDocument()

        imageFiles.forEachIndexed { index, file ->
            val pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, index + 1).create()
            val page = pdfDocument.startPage(pageInfo)
            val canvas: Canvas = page.canvas

            val bitmap = BitmapFactory.decodeStream(FileInputStream(file))
            if (bitmap != null) {
                // Calculate aspect ratio fit with 36pt margins
                val margin = 36
                val printableWidth = pageWidth - (margin * 2)
                val printableHeight = pageHeight - (margin * 2)

                val imgRatio = bitmap.width.toFloat() / bitmap.height.toFloat()
                val targetRatio = printableWidth.toFloat() / printableHeight.toFloat()

                val drawWidth: Int
                val drawHeight: Int
                if (imgRatio > targetRatio) {
                    drawWidth = printableWidth
                    drawHeight = (printableWidth / imgRatio).toInt()
                } else {
                    drawHeight = printableHeight
                    drawWidth = (printableHeight * imgRatio).toInt()
                }

                val left = margin + (printableWidth - drawWidth) / 2
                val top = margin + (printableHeight - drawHeight) / 2
                val dstRect = Rect(left, top, left + drawWidth, top + drawHeight)

                canvas.drawBitmap(bitmap, null, dstRect, null)
                bitmap.recycle()
            }

            pdfDocument.finishPage(page)
        }

        val outputStream = ByteArrayOutputStream()
        pdfDocument.writeTo(outputStream)
        pdfDocument.close()

        outputStream.toByteArray()
    }
}
