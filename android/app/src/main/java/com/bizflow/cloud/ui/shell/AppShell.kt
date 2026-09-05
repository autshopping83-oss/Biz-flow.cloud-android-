package com.bizflow.cloud.ui.shell

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.bizflow.cloud.BizFlowApplication
import com.bizflow.cloud.data.model.DocumentType
import com.bizflow.cloud.navigation.BottomDestination
import com.bizflow.cloud.ui.auth.LoginScreen
import com.bizflow.cloud.ui.auth.RecoverScreen
import com.bizflow.cloud.ui.auth.SignUpScreen
import com.bizflow.cloud.ui.account.AccountScreen
import com.bizflow.cloud.ui.screens.CompanySettingsScreen
import com.bizflow.cloud.ui.screens.CreateDocumentScreen
import com.bizflow.cloud.ui.screens.DocumentsScreen
import com.bizflow.cloud.ui.screens.HomeScreen
import com.bizflow.cloud.ui.screens.MoreScreen
import com.bizflow.cloud.ui.screens.ClientsScreen
import com.bizflow.cloud.ui.screens.FinanceScreen
import com.bizflow.cloud.ui.screens.ProductsScreen
import com.bizflow.cloud.ui.screens.PlaceholderScreen
import com.bizflow.cloud.ui.screens.ReportsScreen
import io.github.jan.supabase.gotrue.SessionStatus
import kotlinx.coroutines.flow.collectLatest

@Composable
fun AppShell() {
    val navController = rememberNavController()
    val app = LocalContext.current.applicationContext as BizFlowApplication
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    LaunchedEffect(currentRoute) {
        app.authManager.sessionStatus.collectLatest { status ->
            if (status is SessionStatus.Authenticated && EditorRoute.AUTH_ROUTES.contains(currentRoute)) {
                navController.popBackStack()
            }
        }
    }

    Scaffold(
        bottomBar = {
            if (EditorRoute.AUTH_ROUTES.contains(currentRoute).not()) {
                AppBottomBar(navController)
            }
        },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = BottomDestination.HOME.route,
            modifier = Modifier.padding(innerPadding),
        ) {
            composable(
                route = BottomDestination.HOME.route,
            ) {
                HomeScreen(
                    onCreateDocument = { type ->
                        navController.navigate("${EditorRoute.EDITOR}/${type.code}")
                    },
                    onViewHistory = {
                        navController.navigate(BottomDestination.DOCUMENTS.route) {
                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    onNewExpense = {
                        navController.navigate("${BottomDestination.FINANCE.route}?openCreate=true") {
                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    onOpenReports = {
                        navController.navigate(EditorRoute.REPORTS)
                    },
                )
            }
            composable(BottomDestination.DOCUMENTS.route) {
                DocumentsScreen(
                    onAddDocument = {
                        navController.navigate("${EditorRoute.EDITOR}/${DocumentType.FATURA.code}")
                    },
                    onEditDocument = { type, docId ->
                        navController.navigate("${EditorRoute.EDITOR}/${type.code}?documentId=$docId")
                    },
                )
            }
            composable(BottomDestination.CLIENTS.route) {
                ClientsScreen(onBack = { navController.popBackStack() })
            }
            composable(BottomDestination.FINANCE.route) {
                FinanceScreen()
            }
            composable(
                route = "${BottomDestination.FINANCE.route}?openCreate={openCreate}",
                arguments = listOf(
                    navArgument("openCreate") {
                        type = NavType.BoolType
                        defaultValue = false
                    },
                ),
            ) {
                FinanceScreen(autoOpenCreate = true)
            }
            composable(BottomDestination.MORE.route) {
                MoreScreen(
                    onOpenCompanySettings = {
                        navController.navigate(EditorRoute.COMPANY_SETTINGS)
                    },
                    onOpenProducts = {
                        navController.navigate(EditorRoute.PRODUCTS)
                    },
                    onOpenReports = {
                        navController.navigate(EditorRoute.REPORTS)
                    },
                    onOpenAccount = { navController.navigate(AccountRoute.ACCOUNT) },
                    onSignOut = { app.authManager.signOut() },
                )
            }
            composable(EditorRoute.PRODUCTS) {
                ProductsScreen(onBack = { navController.popBackStack() })
            }
            composable(EditorRoute.REPORTS) {
                ReportsScreen()
            }
            composable(EditorRoute.COMPANY_SETTINGS) {
                CompanySettingsScreen(onClose = { navController.popBackStack() })
            }
            composable(AccountRoute.ACCOUNT) {
                AccountScreen(
                    onBack = { navController.popBackStack() },
                    onLogin = { navController.navigate(AccountRoute.LOGIN) },
                    onCreateAccount = { navController.navigate(AccountRoute.SIGNUP) },
                    onRecover = { navController.navigate(AccountRoute.RECOVER) },
                    onSignOut = { app.authManager.signOut() },
                )
            }
            composable(AccountRoute.LOGIN) {
                LoginScreen(
                    onBack = { navController.popBackStack() },
                    onCreateAccount = { navController.navigate(AccountRoute.SIGNUP) },
                    onRecover = { navController.navigate(AccountRoute.RECOVER) },
                )
            }
            composable(AccountRoute.SIGNUP) {
                SignUpScreen(onBack = { navController.popBackStack() })
            }
            composable(AccountRoute.RECOVER) {
                RecoverScreen(onBack = { navController.popBackStack() })
            }
            composable(
                route = "${EditorRoute.EDITOR}/{documentType}?documentId={documentId}",
                arguments = listOf(
                    navArgument("documentType") { type = NavType.StringType },
                    navArgument("documentId") {
                        type = NavType.StringType
                        nullable = true
                        defaultValue = null
                    },
                ),
            ) {
                CreateDocumentScreen(onClose = { navController.popBackStack() })
            }
        }
    }
}

private object EditorRoute {
    const val EDITOR = "documentEditor"
    const val COMPANY_SETTINGS = "companySettings"
    const val PRODUCTS = "products"
    const val REPORTS = "reports"
    val AUTH_ROUTES = listOf(AccountRoute.ACCOUNT, AccountRoute.LOGIN, AccountRoute.SIGNUP, AccountRoute.RECOVER)
}

private object AccountRoute {
    const val ACCOUNT = "account"
    const val LOGIN = "login"
    const val SIGNUP = "signup"
    const val RECOVER = "recover"
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
                alwaysShowLabel = false,
            )
        }
    }
}