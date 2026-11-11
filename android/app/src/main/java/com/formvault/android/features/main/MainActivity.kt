package com.formvault.android.features.main

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.navigation.compose.rememberNavController
import com.formvault.android.FormVaultApplication
import com.formvault.android.core.theme.FormVaultTheme
import com.formvault.android.features.navigation.FormVaultApp

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val app = application as FormVaultApplication
        val repository = app.documentRepository
        val preferences = app.preferences

        setContent {
            val isDarkThemePref by preferences.isDarkThemeFlow.collectAsState(initial = isSystemInDarkTheme())

            FormVaultTheme(darkTheme = isDarkThemePref) {
                val navController = rememberNavController()
                FormVaultApp(
                    navController = navController,
                    repository = repository
                )
            }
        }
    }
}
