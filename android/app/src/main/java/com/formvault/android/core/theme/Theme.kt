package com.formvault.android.core.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = VaultPrimary,
    onPrimary = VaultOnPrimary,
    primaryContainer = VaultPrimaryContainer,
    onPrimaryContainer = VaultOnPrimaryContainer,
    secondary = VaultSecondary,
    onSecondary = VaultOnSecondary,
    secondaryContainer = VaultSecondaryContainer,
    onSecondaryContainer = VaultOnSecondaryContainer,
    tertiary = VaultTertiary,
    onTertiary = VaultOnTertiary,
    background = VaultBackground,
    onBackground = VaultOnBackground,
    surface = VaultSurface,
    onSurface = VaultOnSurface,
    surfaceVariant = VaultSurfaceVariant,
    onSurfaceVariant = VaultOnSurfaceVariant,
    outline = VaultOutline,
    outlineVariant = VaultOutlineVariant
)

private val DarkColorScheme = darkColorScheme(
    primary = VaultPrimaryDark,
    onPrimary = VaultOnPrimaryDark,
    background = VaultBackgroundDark,
    onBackground = VaultOnSurfaceDark,
    surface = VaultSurfaceDark,
    onSurface = VaultOnSurfaceDark,
    surfaceVariant = VaultSurfaceVariantDark,
    onSurfaceVariant = VaultOutline,
    outline = VaultOutlineDark
)

@Composable
fun FormVaultTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false, // Keep brand refined blue consistent
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window ?: return@SideEffect
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
