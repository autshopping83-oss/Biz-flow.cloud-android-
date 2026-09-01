package com.bizflow.cloud.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.bizflow.cloud.R
import com.bizflow.cloud.data.local.entity.ClientEntity

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientsScreen(
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ClientsViewModel = viewModel(factory = ClientsViewModel.Factory),
) {
    val clients by viewModel.clients.collectAsStateWithLifecycle()
    var showNew by rememberSaveable { mutableStateOf(false) }
    var editing by rememberSaveable { mutableStateOf<ClientEntity?>(null) }

    Scaffold(
        modifier = modifier,
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text(text = stringResource(R.string.nav_clients)) },
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
        floatingActionButton = {
            FloatingActionButton(onClick = { showNew = true }) {
                Icon(Icons.Filled.Add, contentDescription = stringResource(R.string.clients_add))
            }
        },
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (clients.isEmpty()) {
                item {
                    Text(
                        text = stringResource(R.string.clients_empty),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            items(clients, key = { it.id }) { client ->
                ListItem(
                    headlineContent = { Text(text = client.name) },
                    supportingContent = {
                        Text(text = clientSubtitle(client))
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { editing = client },
                )
            }
        }
    }

    editing?.let { client ->
        ClientFormDialog(
            initial = ClientFormData(
                name = client.name,
                contact = client.contact,
                location = client.location,
                identifier = client.nuit,
            ),
            onConfirm = { data ->
                viewModel.save(
                    id = client.id,
                    name = data.name,
                    contact = data.contact,
                    location = data.location,
                    identifier = data.identifier,
                ) { editing = null }
            },
            onDismiss = { editing = null },
        )
    }

    if (showNew) {
        ClientFormDialog(
            initial = ClientFormData("", "", "", ""),
            onConfirm = { data ->
                viewModel.save(
                    id = null,
                    name = data.name,
                    contact = data.contact,
                    location = data.location,
                    identifier = data.identifier,
                ) { showNew = false }
            },
            onDismiss = { showNew = false },
        )
    }
}

private fun clientSubtitle(client: ClientEntity): String {
    return buildList {
        client.contact.takeIf { it.isNotBlank() }?.let { add(it) }
        client.location.takeIf { it.isNotBlank() }?.let { add(it) }
    }.joinToString(" • ")
}
