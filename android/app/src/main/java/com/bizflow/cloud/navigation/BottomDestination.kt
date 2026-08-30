package com.bizflow.cloud.navigation

import androidx.annotation.StringRes
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.ui.graphics.vector.ImageVector
import com.bizflow.cloud.R

enum class BottomDestination(
    val route: String,
    @StringRes val labelRes: Int,
    val icon: ImageVector,
) {
    HOME("home", R.string.tab_home, Icons.Filled.Home),
    DOCUMENTS("documents", R.string.tab_documents, Icons.Filled.Description),
    FINANCE("finance", R.string.tab_finance, Icons.Filled.AccountBalanceWallet),
    MORE("more", R.string.tab_more, Icons.Filled.MoreHoriz),
}