package com.bizflow.cloud.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Security
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.bizflow.cloud.BuildConfig
import com.bizflow.cloud.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AboutScreen(
    modifier: Modifier = Modifier,
    onBack: () -> Unit = {},
) {
    val context = LocalContext.current

    Scaffold(
        modifier = modifier,
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text(text = stringResource(R.string.about_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.nav_back),
                        )
                    }
                },
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
                headlineContent = {
                    Text(
                        text = stringResource(R.string.about_app_name),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                },
                supportingContent = {
                    Text(
                        text = stringResource(R.string.about_version, BuildConfig.VERSION_NAME),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                },
                leadingContent = { Icon(Icons.Filled.Business, contentDescription = null) },
            )

            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

            ListItem(
                headlineContent = {
                    Text(
                        text = stringResource(R.string.about_legal),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                },
            )

            ListItem(
                headlineContent = { Text(text = stringResource(R.string.about_terms)) },
                leadingContent = { Icon(Icons.Filled.Security, contentDescription = null) },
                trailingContent = { Icon(Icons.AutoMirrored.Filled.OpenInNew, contentDescription = null) },
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.biz-flow.cloud/termos"))
                        context.startActivity(intent)
                    },
            )

            ListItem(
                headlineContent = { Text(text = stringResource(R.string.about_privacy)) },
                leadingContent = { Icon(Icons.Filled.Security, contentDescription = null) },
                trailingContent = { Icon(Icons.AutoMirrored.Filled.OpenInNew, contentDescription = null) },
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.biz-flow.cloud/privacidade"))
                        context.startActivity(intent)
                    },
            )

            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

            ListItem(
                headlineContent = {
                    Text(
                        text = stringResource(R.string.about_website_label),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                },
            )

            ListItem(
                headlineContent = { Text(text = "www.biz-flow.cloud") },
                leadingContent = { Icon(Icons.Filled.Language, contentDescription = null) },
                trailingContent = { Icon(Icons.AutoMirrored.Filled.OpenInNew, contentDescription = null) },
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.biz-flow.cloud"))
                        context.startActivity(intent)
                    },
            )

            HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))

            ListItem(
                headlineContent = {
                    Text(
                        text = stringResource(R.string.about_support),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                },
            )

            ListItem(
                headlineContent = { Text(text = "bizflow.cloud@gmail.com") },
                leadingContent = { Icon(Icons.Filled.Email, contentDescription = null) },
                trailingContent = { Icon(Icons.AutoMirrored.Filled.OpenInNew, contentDescription = null) },
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        val intent = Intent(Intent.ACTION_SENDTO).apply {
                            data = Uri.parse("mailto:bizflow.cloud@gmail.com")
                        }
                        context.startActivity(intent)
                    },
            )

            ListItem(
                headlineContent = { Text(text = "+258840636794") },
                leadingContent = { Icon(Icons.Filled.Phone, contentDescription = null) },
                trailingContent = { Icon(Icons.AutoMirrored.Filled.OpenInNew, contentDescription = null) },
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        val intent = Intent(Intent.ACTION_DIAL).apply {
                            data = Uri.parse("tel:+258840636794")
                        }
                        context.startActivity(intent)
                    },
            )
        }
    }
}
