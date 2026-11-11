package com.formvault.android.features.details

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.formvault.android.domain.model.DocumentVersion
import com.formvault.android.domain.repository.DocumentRepository
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocumentDetailScreen(
    documentId: String,
    repository: DocumentRepository,
    onNavigateBack: () -> Unit
) {
    val document by repository.getDocumentById(documentId).collectAsState(initial = null)
    val versions by repository.getDocumentVersions(documentId).collectAsState(initial = emptyList())
    val coroutineScope = rememberCoroutineScope()
    var showDeleteConfirmDialog by remember { mutableStateOf(false) }

    LaunchedEffect(documentId) {
        repository.recordAccess(documentId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(document?.title ?: "Document Details", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { showDeleteConfirmDialog = true }) {
                        Icon(Icons.Filled.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                    }
                }
            )
        }
    ) { padding ->
        val currentDoc = document
        if (currentDoc == null) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                contentPadding = PaddingValues(bottom = 24.dp)
            ) {
                // Main Document Card
                item {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        color = MaterialTheme.colorScheme.surface,
                        shadowElevation = 1.dp
                    ) {
                        Column(modifier = Modifier.padding(18.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertizontally) {
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = MaterialTheme.colorScheme.primaryContainer,
                                    modifier = Modifier.size(52.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            if (currentDoc.mimeType.contains("pdf")) Icons.Filled.PictureAsPdf else Icons.Filled.Image,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.primary,
                                            modifier = Modifier.size(28.dp)
                                        )
                                    }
                                }
                                Spacer(modifier = Modifier.width(14.dp))
                                Column {
                                    Text(currentDoc.title, style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                                    Text(currentDoc.category.displayName, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                                }
                            }

                            Spacer(modifier = Modifier.height(18.dp))
                            HorizontalDivider()
                            Spacer(modifier = Modifier.height(14.dp))

                            DetailRow(label = "Original File", value = currentDoc.originalFileName)
                            DetailRow(label = "MIME Type", value = currentDoc.mimeType)
                            DetailRow(label = "File Size", value = formatBytes(currentDoc.fileSizeBytes))
                            val dateFormat = SimpleDateFormat("MMM dd, yyyy • hh:mm a", Locale.getDefault())
                            DetailRow(label = "Imported On", value = dateFormat.format(Date(currentDoc.createdAt)))
                            DetailRow(label = "Security", value = "Isolated internal storage (Private)")
                        }
                    }
                }

                // Generated Versions Header
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertizontally
                    ) {
                        Text("Prepared Versions (${versions.size})", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                    }
                }

                if (versions.isEmpty()) {
                    item {
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                        ) {
                            Text(
                                text = "No prepared versions yet. Use the Tools tab to generate resized photos, compressed files, or PDFs from this document.",
                                modifier = Modifier.padding(16.dp),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                } else {
                    items(versions) { ver ->
                        VersionRowItem(version = ver)
                    }
                }
            }
        }

        if (showDeleteConfirmDialog) {
            AlertDialog(
                onDismissRequest = { showDeleteConfirmDialog = false },
                title = { Text("Delete Document?") },
                text = { Text("This will permanently remove the original file and all generated versions from private local storage. This action cannot be undone.") },
                confirmButton = {
                    TextButton(
                        onClick = {
                            coroutineScope.launch {
                                repository.deleteDocument(documentId)
                                showDeleteConfirmDialog = false
                                onNavigateBack()
                            }
                        }
                    ) {
                        Text("Delete Permanently", color = MaterialTheme.colorScheme.error)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showDeleteConfirmDialog = false }) {
                        Text("Cancel")
                    }
                }
            )
        }
    }
}

@Composable
fun DetailRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium))
    }
}

@Composable
fun VersionRowItem(version: DocumentVersion) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 1.dp
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertizontally
        ) {
            Icon(Icons.Filled.FileCopy, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(version.label, style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold))
                version.targetSpec?.let { spec ->
                    Text(spec, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                }
                Text(formatBytes(version.fileSizeBytes), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            IconButton(onClick = { /* Export via SAF */ }) {
                Icon(Icons.Filled.Share, contentDescription = "Export")
            }
        }
    }
}

private fun formatBytes(bytes: Long): String {
    val kb = bytes / 1024.0
    return if (kb > 1024) String.format("%.2f MB", kb / 1024.0) else String.format("%.1f KB", kb)
}
