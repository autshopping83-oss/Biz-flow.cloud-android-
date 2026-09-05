package com.bizflow.cloud.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Inventory
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.bizflow.cloud.R
import com.bizflow.cloud.core.util.LocaleHelper
import java.util.Locale
import kotlinx.coroutines.launch

private val supportedLanguageTags = listOf(
    "pt",
    "pt-BR",
    "pt-PT",
    "en",
    "es",
    "fr",
    "zh-CN",
)

private fun nativeName(tag: String): String {
    val locale = Locale.forLanguageTag(tag)
    return locale.getDisplayName(locale).replaceFirstChar { it.uppercase() }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MoreScreen(
    modifier: Modifier = Modifier,
    onOpenCompanySettings: () -> Unit = {},
    onOpenProducts: () -> Unit = {},
    onOpenReports: () -> Unit = {},
    onOpenAbout: () -> Unit = {},
    onOpenAccount: () -> Unit = {},
    onSignOut: suspend () -> Unit = {},
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var showSettings by rememberSaveable { mutableStateOf(false) }
    var showLanguages by rememberSaveable { mutableStateOf(false) }
    var showFirstAccess by rememberSaveable { mutableStateOf(false) }
    val currentLanguage = LocaleHelper.getCurrentLanguageTag(context)

    LaunchedEffect(Unit) {
        val prefs = context.getSharedPreferences("bizflow_about", android.content.Context.MODE_PRIVATE)
        if (!prefs.getBoolean("first_access_shown", false)) {
            showFirstAccess = true
        }
    }

    Scaffold(
        modifier = modifier,
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text(text = stringResource(R.string.nav_more)) },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface,
                ),
            )
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            ListItem(
                headlineContent = { Text(text = stringResource(R.string.more_company_settings)) },
                leadingContent = { Icon(Icons.Filled.Business, contentDescription = null) },
                trailingContent = { Icon(Icons.Filled.ChevronRight, contentDescription = null) },
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOpenCompanySettings() },
            )
            ListItem(
                headlineContent = { Text(text = stringResource(R.string.products_title)) },
                leadingContent = { Icon(Icons.Filled.Inventory, contentDescription = null) },
                trailingContent = { Icon(Icons.Filled.ChevronRight, contentDescription = null) },
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOpenProducts() },
            )
            ListItem(
                headlineContent = { Text(text = stringResource(R.string.reports_title)) },
                leadingContent = { Icon(Icons.Filled.Assessment, contentDescription = null) },
                trailingContent = { Icon(Icons.Filled.ChevronRight, contentDescription = null) },
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOpenReports() },
            )
            ListItem(
                headlineContent = { Text(text = stringResource(R.string.more_settings)) },
                leadingContent = { Icon(Icons.Filled.Settings, contentDescription = null) },
                trailingContent = { Icon(Icons.Filled.ChevronRight, contentDescription = null) },
                modifier = Modifier.clickable { showSettings = true },
            )
            ListItem(
                headlineContent = { Text(text = stringResource(R.string.account_title)) },
                leadingContent = { Icon(Icons.Filled.Cloud, contentDescription = null) },
                trailingContent = { Icon(Icons.Filled.ChevronRight, contentDescription = null) },
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOpenAccount() },
            )
            ListItem(
                headlineContent = { Text(text = stringResource(R.string.about_title)) },
                leadingContent = { Icon(Icons.Filled.Info, contentDescription = null) },
                trailingContent = { Icon(Icons.Filled.ChevronRight, contentDescription = null) },
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOpenAbout() },
            )
            ListItem(
                headlineContent = { Text(text = stringResource(R.string.more_sign_out)) },
                leadingContent = { Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null) },
                modifier = Modifier.clickable { scope.launch { onSignOut() } },
            )
        }
    }

    if (showSettings) {
        SettingsDialog(
            currentLanguage = currentLanguage,
            onOpenLanguages = {
                showSettings = false
                showLanguages = true
            },
            onDismiss = { showSettings = false },
        )
    }
    if (showLanguages) {
        LanguageDialog(
            currentTag = currentLanguage,
            onLanguageSelected = { tag ->
                LocaleHelper.changeLanguage(context, tag)
                showLanguages = false
            },
            onDismiss = { showLanguages = false },
        )
    }
    if (showFirstAccess) {
        FirstAccessDialog(
            onDismiss = {
                showFirstAccess = false
                context.getSharedPreferences("bizflow_about", android.content.Context.MODE_PRIVATE)
                    .edit().putBoolean("first_access_shown", true).apply()
            },
        )
    }
}

@Composable
private fun SettingsDialog(
    currentLanguage: String,
    onOpenLanguages: () -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = { Icon(Icons.Filled.Settings, contentDescription = null) },
        title = { Text(text = stringResource(R.string.more_settings)) },
        text = {
            ListItem(
                headlineContent = { Text(text = stringResource(R.string.settings_language)) },
                supportingContent = { Text(text = nativeName(currentLanguage)) },
                leadingContent = { Icon(Icons.Filled.Language, contentDescription = null) },
                trailingContent = { Icon(Icons.Filled.ChevronRight, contentDescription = null) },
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOpenLanguages() },
            )
        },
        confirmButton = {},
    )
}

@Composable
private fun LanguageDialog(
    currentTag: String,
    onLanguageSelected: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(text = stringResource(R.string.settings_language)) },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                supportedLanguageTags.forEach { tag ->
                    ListItem(
                        headlineContent = { Text(text = nativeName(tag)) },
                        leadingContent = {
                            if (tag == currentTag) {
                                Icon(Icons.Filled.Check, contentDescription = null)
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onLanguageSelected(tag) },
                    )
                }
            }
        },
        confirmButton = {},
    )
}

@Composable
private fun FirstAccessDialog(onDismiss: () -> Unit) {
    val context = LocalContext.current
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = { Icon(Icons.Filled.Info, contentDescription = null) },
        title = { Text(text = stringResource(R.string.about_first_access_title)) },
        text = {
            Column {
                Text(
                    text = stringResource(R.string.about_first_access_message),
                    style = MaterialTheme.typography.bodyMedium,
                )
                ListItem(
                    headlineContent = { Text(text = stringResource(R.string.about_terms)) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.biz-flow.cloud/termos"))
                            context.startActivity(intent)
                        },
                )
                ListItem(
                    headlineContent = { Text(text = stringResource(R.string.about_privacy)) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.biz-flow.cloud/privacidade"))
                            context.startActivity(intent)
                        },
                )
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text(text = stringResource(R.string.about_continue))
            }
        },
    )
}