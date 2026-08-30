package com.bizflow.cloud.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.bizflow.cloud.R
import com.bizflow.cloud.ui.screens.HomeScreen
import com.bizflow.cloud.ui.screens.PlaceholderScreen

@Composable
fun RootNavHost() {
    val navController = rememberNavController()
    NavHost(
        navController = navController,
        startDestination = Destinations.HOME,
    ) {
        composable(Destinations.HOME) {
            HomeScreen()
        }
        composable(Destinations.DOCUMENTS) {
            PlaceholderScreen(titleRes = R.string.tab_documents)
        }
        composable(Destinations.FINANCE) {
            PlaceholderScreen(titleRes = R.string.tab_finance)
        }
        composable(Destinations.MORE) {
            PlaceholderScreen(titleRes = R.string.tab_more)
        }
    }
}