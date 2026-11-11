package com.formvault.android.processing

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import com.formvault.android.domain.model.Document
import com.formvault.android.domain.model.ProfileRequirement
import com.formvault.android.domain.model.PreparedDocumentResult
import com.formvault.android.domain.model.PreparationPackageResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

/**
 * FORMVAULT — Native Android Application Preparation Pipeline
 * 100% Offline, on-device document requirement validation, iterative transformation,
 * and structured ZIP export packaging.
 */
class ApplicationPreparationEngine(
    private val context: Context,
    private val imageCompressor: ImageCompressor,
    private val imageResizer: ImageResizer,
    private val pdfProcessor: PdfProcessor
) {
    suspend fun prepareSingleRequirement(
        requirement: ProfileRequirement,
        sourceDoc: Document,
        onProgress: (String) -> Unit = {}
    ): PreparedDocumentResult = withContext(Dispatchers.IO) {
        val transformations = mutableListOf<String>()
        val warnings = mutableListOf<String>()

        val sourceFile = File(sourceDoc.filePath)
        var currentFile = sourceFile
        var currentSizeBytes = sourceFile.length()
        var currentMime = sourceDoc.mimeType
        var currentWidth = sourceDoc.widthPx ?: 0
        var currentHeight = sourceDoc.heightPx ?: 0

        val allowed = requirement.allowedFormats.ifEmpty {
            listOf("image/jpeg", "image/png", "application/pdf")
        }
        val prefersPdf = allowed.size == 1 && allowed.first() == "application/pdf"
        val prefersImage = !allowed.contains("application/pdf")

        // 1. Cross-modal conversion (PDF <-> Image)
        if (sourceDoc.mimeType == "application/pdf" && prefersImage) {
            onProgress("Rendering first page of PDF...")
            val extracted = pdfProcessor.renderPagesToBitmaps(sourceFile, listOf(0), 2.0f)
            if (extracted.isNotEmpty()) {
                val tempFile = File.createTempFile("prep_page_", ".jpg", context.cacheDir)
                FileOutputStream(tempFile).use { out ->
                    extracted[0].bitmap.compress(Bitmap.CompressFormat.JPEG, 92, out)
                }
                currentFile = tempFile
                currentSizeBytes = tempFile.length()
                currentMime = "image/jpeg"
                currentWidth = extracted[0].bitmap.width
                currentHeight = extracted[0].bitmap.height
                transformations.add("Rendered PDF page 1 to JPEG image")
            }
        } else if (sourceDoc.mimeType.startsWith("image/") && prefersPdf) {
            onProgress("Packaging image into PDF document...")
            val pdfFile = File.createTempFile("prep_doc_", ".pdf", context.cacheDir)
            pdfProcessor.imagesToPdf(listOf(sourceFile), pdfFile, PdfProcessor.PageSizeOption.A4)
            currentFile = pdfFile
            currentSizeBytes = pdfFile.length()
            currentMime = "application/pdf"
            transformations.add("Packaged image into standard A4 PDF")
        }

        // 2. Image Transformations
        if (currentMime.startsWith("image/")) {
            if (requirement.requiredWidthPx != null && requirement.requiredHeightPx != null) {
                onProgress("Resizing to exact ${requirement.requiredWidthPx}x${requirement.requiredHeightPx} px...")
                val resizedFile = File.createTempFile("prep_resize_", ".jpg", context.cacheDir)
                imageResizer.resizeImage(
                    sourceFile = currentFile,
                    targetWidth = requirement.requiredWidthPx,
                    targetHeight = requirement.requiredHeightPx,
                    maintainAspectRatio = false,
                    outputFile = resizedFile
                )
                currentFile = resizedFile
                currentSizeBytes = resizedFile.length()
                currentWidth = requirement.requiredWidthPx
                currentHeight = requirement.requiredHeightPx
                transformations.add("Resized to ${requirement.requiredWidthPx} × ${requirement.requiredHeightPx} px")
            }

            // File Size Compression
            if (requirement.maxSizeBytes != null && currentSizeBytes > requirement.maxSizeBytes) {
                onProgress("Iteratively compressing image to <${requirement.maxSizeBytes / 1024} KB...")
                val compressedFile = File.createTempFile("prep_comp_", ".jpg", context.cacheDir)
                val compRes = imageCompressor.compressIterative(
                    sourceFile = currentFile,
                    targetBytes = requirement.maxSizeBytes,
                    outputFile = compressedFile
                )
                currentFile = compressedFile
                currentSizeBytes = compRes.actualSizeBytes
                currentWidth = compRes.outputWidth
                currentHeight = compRes.outputHeight
                transformations.add("Compressed to ${currentSizeBytes / 1024} KB (Quality: ${compRes.qualityUsed}%)")

                if (!compRes.isTargetMet) {
                    warnings.add("Could not compress below ${requirement.maxSizeBytes / 1024} KB without severe artifacts.")
                }
            }
        }

        // 3. PDF Optimization
        if (currentMime == "application/pdf" && requirement.maxSizeBytes != null && currentSizeBytes > requirement.maxSizeBytes) {
            onProgress("Optimizing PDF document streams...")
            val optFile = File.createTempFile("prep_opt_", ".pdf", context.cacheDir)
            val optRes = pdfProcessor.optimizePdf(currentFile, optFile, PdfProcessor.PdfQualityOption.MEDIUM)
            if (optRes.optimizedSizeBytes < currentSizeBytes) {
                currentFile = optFile
                currentSizeBytes = optRes.optimizedSizeBytes
                transformations.add("Optimized PDF from ${optRes.originalSizeBytes / 1024} KB to ${optRes.optimizedSizeBytes / 1024} KB")
            }
        }

        // Final Compliance Checks
        var isCompliant = true
        if (requirement.maxSizeBytes != null && currentSizeBytes > requirement.maxSizeBytes) {
            warnings.add("Output size (${currentSizeBytes / 1024} KB) exceeds maximum allowed (${requirement.maxSizeBytes / 1024} KB)")
            isCompliant = false
        }
        if (requirement.minSizeBytes != null && currentSizeBytes < requirement.minSizeBytes) {
            warnings.add("Output size (${currentSizeBytes / 1024} KB) is below minimum allowed (${requirement.minSizeBytes / 1024} KB)")
            isCompliant = false
        }

        val ext = if (currentMime == "application/pdf") "pdf" else if (currentMime == "image/png") "png" else "jpg"
        val cleanName = requirement.name.replace("[^a-zA-Z0-9_\\-\\s]".toRegex(), "").trim().replace("\\s+".toRegex(), "_")
        val finalFileName = "${cleanName}.$ext"

        PreparedDocumentResult(
            requirementId = requirement.id,
            requirementName = requirement.name,
            sourceDocumentId = sourceDoc.id,
            outputFileName = finalFileName,
            outputMimeType = currentMime,
            outputSizeBytes = currentSizeBytes,
            outputFilePath = currentFile.absolutePath,
            outputWidthPx = if (currentWidth > 0) currentWidth else null,
            outputHeightPx = if (currentHeight > 0) currentHeight else null,
            transformationsApplied = transformations.ifEmpty { listOf("Source already compliant") },
            warnings = warnings,
            isCompliant = isCompliant
        )
    }

    suspend fun createZipPackage(
        profileTitle: String,
        targetOrg: String,
        items: List<PreparedDocumentResult>,
        outputZipFile: File
    ): String = withContext(Dispatchers.IO) {
        val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
        val dateStr = dateFormat.format(Date())

        val auditReport = buildString {
            appendLine("========================================================================")
            appendLine("FORMVAULT — NATIVE ANDROID APPLICATION PREPARATION AUDIT")
            appendLine("Generated Offline: $dateStr")
            appendLine("Profile: $profileTitle")
            appendLine("Target Organization: $targetOrg")
            appendLine("Files Prepared: ${items.size}")
            appendLine("Package Total Size: ${items.sumOf { it.outputSizeBytes } / 1024} KB")
            appendLine("========================================================================")
            appendLine()
            items.forEachIndexed { idx, item ->
                appendLine("[Item ${idx + 1}] ${item.requirementName}")
                appendLine("   • File: ${item.outputFileName}")
                appendLine("   • Size: ${item.outputSizeBytes / 1024} KB (${item.outputSizeBytes} bytes)")
                if (item.outputWidthPx != null && item.outputHeightPx != null) {
                    appendLine("   • Dimensions: ${item.outputWidthPx} x ${item.outputHeightPx} px")
                }
                appendLine("   • Compliance: ${if (item.isCompliant) "PASS" else "WARNING"}")
                item.transformationsApplied.forEach { appendLine("       - $it") }
                item.warnings.forEach { appendLine("       ! $it") }
                appendLine()
            }
            appendLine("========================================================================")
            appendLine("Protected with FormVault isolated local storage and zero cloud telemetry.")
            appendLine("========================================================================")
        }

        ZipOutputStream(FileOutputStream(outputZipFile)).use { zos ->
            // Add prepared files
            for (item in items) {
                val file = File(item.outputFilePath)
                if (file.exists()) {
                    zos.putNextEntry(ZipEntry(item.outputFileName))
                    FileInputStream(file).use { fis ->
                        fis.copyTo(zos)
                    }
                    zos.closeEntry()
                }
            }

            // Add Audit Report
            zos.putNextEntry(ZipEntry("Application_Checklist_Summary.txt"))
            zos.write(auditReport.toByteArray(Charsets.UTF_8))
            zos.closeEntry()
        }

        auditReport
    }
}
