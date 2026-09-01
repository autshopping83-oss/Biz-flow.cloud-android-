package com.bizflow.cloud.navigation

import androidx.annotation.StringRes
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.People
import androidx.compose.ui.graphics.vector.ImageVector
import com.bizflow.cloud.R

enum class BottomDestination(
    val route: String,
    @StringRes val labelRes: Int,
    val icon: ImageVector,
) {
    HOME("home", R.string.nav_home, Icons.Filled.Home),
    DOCUMENTS("documents", R.string.nav_documents, Icons.Filled.Description),
    CLIENTS("clients", R.string.nav_clients, Icons.Filled.People),
    FINANCE("finance", R.string.nav_finance, Icons.Filled.AccountBalanceWallet),
    MORE("more", R.string.nav_more, Icons.Filled.MoreHoriz),
}