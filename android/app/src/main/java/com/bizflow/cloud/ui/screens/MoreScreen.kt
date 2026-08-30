package com.bizflow.cloud.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.bizflow.cloud.R
import com.bizflow.cloud.core.util.LocaleHelper
import java.util.Locale

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
) {
    val context = LocalContext.current
    var showSettings by rememberSaveable { mutableStateOf(false) }
    var showLanguages by rememberSaveable { mutableStateOf(false) }
    val currentLanguage = LocaleHelper.getCurrentLanguageTag(context)

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
                headlineContent = { Text(text = stringResource(R.string.more_settings)) },
                leadingContent = { Icon(Icons.Filled.Settings, contentDescription = null) },
                trailingContent = { Icon(Icons.Filled.ChevronRight, contentDescription = null) },
                modifier = Modifier.clickable { showSettings = true },
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