package com.formvault.android.features.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.navArgument
import com.formvault.android.domain.repository.DocumentRepository
import com.formvault.android.features.details.DocumentDetailScreen
import com.formvault.android.features.home.HomeScreen
import com.formvault.android.features.profiles.ProfilesScreen
import com.formvault.android.features.settings.SettingsScreen
import com.formvault.android.features.splash.SplashScreen
import com.formvault.android.features.tools.ToolsScreen
import com.formvault.android.features.vault.VaultScreen

@Composable
fun FormVaultApp(
    navController: NavHostController,
    repository: DocumentRepository
) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val showBottomBar = currentRoute in listOf(
        Screen.Home.route,
        Screen.Vault.route,
        Screen.Tools.route,
        Screen.Profiles.route,
        Screen.Settings.route
    )

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    bottomNavItems.forEach { item ->
                        val selected = currentRoute == item.route
                        NavigationBarItem(
                            icon = {
                                Icon(
                                    imageVector = if (selected) item.selectedIcon else item.unselectedIcon,
                                    contentDescription = item.title
                                )
                            },
                            label = { Text(item.title) },
                            selected = selected,
                            onClick = {
                                if (currentRoute != item.route) {
                                    navController.navigate(item.route) {
                                        popUpTo(navController.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                }
                            }
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Splash.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Splash.route) {
                SplashScreen(
                    onSplashFinished = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Splash.route) { inclusive = true }
                        }
                    }
                )
            }

            composable(Screen.Home.route) {
                HomeScreen(
                    repository = repository,
                    onNavigateToVault = { category ->
                        navController.navigate(Screen.Vault.route)
                    },
                    onNavigateToDocument = { docId ->
                        navController.navigate(Screen.DocumentDetail.createRoute(docId))
                    },
                    onNavigateToTools = {
                        navController.navigate(Screen.Tools.route)
                    },
                    onNavigateToProfiles = {
                        navController.navigate(Screen.Profiles.route)
                    }
                )
            }

            composable(Screen.Vault.route) {
                VaultScreen(
                    repository = repository,
                    onDocumentClick = { docId ->
                        navController.navigate(Screen.DocumentDetail.createRoute(docId))
                    }
                )
            }

            composable(Screen.Tools.route) {
                ToolsScreen(
                    repository = repository,
                    onDocumentCreated = { docId ->
                        navController.navigate(Screen.DocumentDetail.createRoute(docId))
                    }
                )
            }

            composable(Screen.Profiles.route) {
                ProfilesScreen(
                    repository = repository
                )
            }

            composable(Screen.Settings.route) {
                SettingsScreen(
                    repository = repository
                )
            }

            composable(
                route = Screen.DocumentDetail.route,
                arguments = listOf(navArgument("documentId") { type = NavType.StringType })
            ) { backStackEntry ->
                val documentId = backStackEntry.arguments?.getString("documentId").orEmpty()
                DocumentDetailScreen(
                    documentId = documentId,
                    repository = repository,
                    onNavigateBack = { navController.popBackStack() }
                )
            }
        }
    }
}
