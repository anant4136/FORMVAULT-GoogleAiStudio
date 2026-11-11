package com.formvault.android.features.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.outlined.Build
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(val route: String) {
    data object Splash : Screen("splash")
    data object Home : Screen("home")
    data object Vault : Screen("vault")
    data object Tools : Screen("tools")
    data object Profiles : Screen("profiles")
    data object Settings : Screen("settings")
    data object CategoryDetail : Screen("category/{categoryId}") {
        fun createRoute(categoryId: String) = "category/$categoryId"
    }
    data object DocumentDetail : Screen("document/{documentId}") {
        fun createRoute(documentId: String) = "document/$documentId"
    }
}

data class BottomNavItem(
    val route: String,
    val title: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
)

val bottomNavItems = listOf(
    BottomNavItem(Screen.Home.route, "Home", Icons.Filled.Home, Icons.Outlined.Home),
    BottomNavItem(Screen.Vault.route, "My Vault", Icons.Filled.Folder, Icons.Outlined.Folder),
    BottomNavItem(Screen.Tools.route, "Tools", Icons.Filled.Build, Icons.Outlined.Build),
    BottomNavItem(Screen.Profiles.route, "Profiles", Icons.Filled.Person, Icons.Outlined.Person),
    BottomNavItem(Screen.Settings.route, "Settings", Icons.Filled.Settings, Icons.Outlined.Settings)
)
