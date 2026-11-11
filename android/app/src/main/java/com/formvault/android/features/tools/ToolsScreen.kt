package com.formvault.android.features.tools

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.formvault.android.domain.repository.DocumentRepository

data class ToolDefinition(
    val id: String,
    val title: String,
    val subtitle: String,
    val icon: ImageVector,
    val badge: String? = null
)

val availableTools = listOf(
    ToolDefinition(
        id = "compress",
        title = "File Compressor & Resizer",
        subtitle = "Target strict KB limits (<20KB, <50KB, <100KB) for government & job portals",
        icon = Icons.Filled.Compress,
        badge = "Most Popular"
    ),
    ToolDefinition(
        id = "passport",
        title = "Passport & ID Photo Maker",
        subtitle = "Crop to standard 35x45mm, 2x2 inch specs with neutral white/blue backgrounds",
        icon = Icons.Filled.Face
    ),
    ToolDefinition(
        id = "signature",
        title = "Signature Extractor",
        subtitle = "Remove paper texture, enhance ink contrast, and export clean transparent PNG",
        icon = Icons.Filled.Draw
    ),
    ToolDefinition(
        id = "pdf",
        title = "Image to PDF Generator",
        subtitle = "Combine certificates and marksheets into standard single or multi-page A4 PDFs",
        icon = Icons.Filled.PictureAsPdf
    ),
    ToolDefinition(
        id = "enhance",
        title = "Document Scanner & Enhancer",
        subtitle = "Auto-level contrast, grayscale filters, and perspective cropping",
        icon = Icons.Filled.DocumentScanner
    ),
    ToolDefinition(
        id = "convert",
        title = "Format Converter",
        subtitle = "Convert images between JPEG, PNG, and WebP offline with custom quality",
        icon = Icons.Filled.Transform
    )
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ToolsScreen(
    repository: DocumentRepository,
    onDocumentCreated: (String) -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Preparation Tools", fontWeight = FontWeight.Bold) }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            contentPadding = PaddingValues(bottom = 24.dp)
        ) {
            item {
                Text(
                    text = "All tools run strictly on-device without internet access, keeping sensitive identity documents 100% private.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            items(availableTools.size) { index ->
                val tool = availableTools[index]
                ToolItemCard(
                    tool = tool,
                    onClick = {
                        // Launch tool workflow
                    }
                )
            }
        }
    }
}

@Composable
fun ToolItemCard(
    tool: ToolDefinition,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 1.dp
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertizontally
        ) {
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.7f),
                modifier = Modifier.size(50.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(tool.icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(26.dp))
                }
            }
            Spacer(modifier = Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertizontally) {
                    Text(tool.title, style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold))
                    tool.badge?.let {
                        Spacer(modifier = Modifier.width(8.dp))
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                        ) {
                            Text(
                                text = it,
                                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(tool.subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Icon(Icons.Filled.ChevronRight, contentDescription = "Open tool", tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
