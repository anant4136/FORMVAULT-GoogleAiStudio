package com.formvault.android.features.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.formvault.android.domain.repository.DocumentRepository

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    repository: DocumentRepository
) {
    var isDarkTheme by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings", fontWeight = FontWeight.Bold) }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(bottom = 24.dp)
        ) {
            // Privacy Architecture Card
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f)
                ) {
                    Row(
                        modifier = Modifier.padding(18.dp),
                        verticalAlignment = Alignment.CenterVertizontally
                    ) {
                        Icon(Icons.Filled.VerifiedUser, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(36.dp))
                        Spacer(modifier = Modifier.width(14.dp))
                        Column {
                            Text("100% Offline Architecture", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                            Text(
                                "Zero network permissions, no telemetry, no cloud sync, no tracking. All files remain in private internal storage.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            // Preferences
            item {
                Text("Appearance & Storage", style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
            }

            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surface,
                    shadowElevation = 1.dp
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertizontally
                        ) {
                            Column {
                                Text("Dark Theme", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold))
                                Text("Switch between light and dark Material 3 theme", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Switch(
                                checked = isDarkTheme,
                                onCheckedChange = { isDarkTheme = it }
                            )
                        }

                        Spacer(modifier = Modifier.height(14.dp))
                        HorizontalDivider()
                        Spacer(modifier = Modifier.height(14.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertizontally
                        ) {
                            Column {
                                Text("Clear Temporary Cache", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold))
                                Text("Purge intermediate processing artifacts", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            OutlinedButton(onClick = { /* Clear temp */ }) {
                                Text("Clear")
                            }
                        }
                    }
                }
            }

            // Technical Specs
            item {
                Text("Technical Specifications", style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
            }

            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surface,
                    shadowElevation = 1.dp
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        TechRow(label = "Architecture", value = "MVVM + Clean Architecture")
                        TechRow(label = "Local Database", value = "Android Room 2.6.1 (SQLite)")
                        TechRow(label = "Preferences", value = "Android Jetpack DataStore")
                        TechRow(label = "UI Toolkit", value = "Jetpack Compose + Material 3")
                        TechRow(label = "Target SDK", value = "Android 15 (API 35)")
                        TechRow(label = "Min SDK", value = "Android 8.0 (API 26)")
                        TechRow(label = "Ads Provider", value = "NoAdsProvider (Disabled)")
                    }
                }
            }

            // About FormVault
            item {
                Text(
                    text = "FormVault v1.0.0 • Production Native Android Build",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(start = 4.dp)
                )
            }
        }
    }
}

@Composable
fun TechRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 5.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold))
    }
}
