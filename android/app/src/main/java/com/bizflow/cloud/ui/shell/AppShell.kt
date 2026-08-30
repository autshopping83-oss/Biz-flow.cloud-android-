package com.bizflow.cloud.ui.shell

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.navigation.navDeepLink
import com.bizflow.cloud.data.model.DocumentType
import com.bizflow.cloud.navigation.BottomDestination
import com.bizflow.cloud.ui.screens.CompanySettingsScreen
import com.bizflow.cloud.ui.screens.CreateDocumentScreen
import com.bizflow.cloud.ui.screens.DocumentsScreen
import com.bizflow.cloud.ui.screens.HomeScreen
import com.bizflow.cloud.ui.screens.MoreScreen
import com.bizflow.cloud.ui.screens.PlaceholderScreen

@Composable
fun AppShell() {
    val navController = rememberNavController()
    Scaffold(
        bottomBar = { AppBottomBar(navController) },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = BottomDestination.HOME.route,
            modifier = Modifier.padding(innerPadding),
        ) {
            composable(
                route = BottomDestination.HOME.route,
                deepLinks = listOf(navDeepLink { uriPattern = "bizflow://auth" }),
            ) {
                HomeScreen(
                    onCreateDocument = { type ->
                        navController.navigate("${EditorRoute.EDITOR}/${type.code}")
                    },
                )
            }
            composable(BottomDestination.DOCUMENTS.route) {
                DocumentsScreen(
                    onAddDocument = {
                        navController.navigate("${EditorRoute.EDITOR}/${DocumentType.FATURA.code}")
                    },
                )
            }
            composable(BottomDestination.FINANCE.route) {
                PlaceholderScreen(titleRes = BottomDestination.FINANCE.labelRes)
            }
            composable(BottomDestination.MORE.route) {
                MoreScreen(
                    onOpenCompanySettings = {
                        navController.navigate(EditorRoute.COMPANY_SETTINGS)
                    },
                )
            }
            composable(
                route = "${EditorRoute.EDITOR}/{documentType}",
                arguments = listOf(
                    navArgument("documentType") { type = NavType.StringType },
                ),
            ) {
                CreateDocumentScreen(onClose = { navController.popBackStack() })
            }
            composable(EditorRoute.COMPANY_SETTINGS) {
                CompanySettingsScreen(onClose = { navController.popBackStack() })
            }
        }
    }
}

private object EditorRoute {
    const val EDITOR = "documentEditor"
    const val COMPANY_SETTINGS = "companySettings"
}

@Composable
private fun AppBottomBar(navController: NavHostController) {
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    NavigationBar {
        BottomDestination.entries.forEach { destination ->
            val label = stringResource(destination.labelRes)
            NavigationBarItem(
                selected = currentRoute == destination.route,
                onClick = {
                    navController.navigate(destination.route) {
                        popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                        launchSingleTop = true
                        restoreState = true
                    }
                },
                icon = { Icon(destination.icon, contentDescription = label) },
                label = { Text(text = label) },
            )
        }
    }
}