package com.bizflow.cloud.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.bizflow.cloud.R
import com.bizflow.cloud.data.model.Currency
import com.bizflow.cloud.data.model.CurrencyCatalog

@Composable
fun CurrencySelector(
    selectedCode: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var showDialog by remember { mutableStateOf(false) }
    val selected = remember(selectedCode) {
        CurrencyCatalog.byCode(selectedCode) ?: CurrencyCatalog.byCode(CurrencyCatalog.DEFAULT_CODE)!!
    }

    Box(modifier = modifier.fillMaxWidth()) {
        OutlinedTextField(
            value = currencyLabel(selected),
            onValueChange = {},
            label = { Text(text = stringResource(R.string.settings_currency)) },
            readOnly = true,
            singleLine = true,
            enabled = false,
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
            modifier = Modifier.fillMaxWidth(),
        )
        Box(
            modifier = Modifier
                .matchParentSize()
                .clickable { showDialog = true },
        )
    }

    if (showDialog) {
        CurrencyPickerDialog(
            onSelect = {
                onSelect(it)
                showDialog = false
            },
            onDismiss = { showDialog = false },
        )
    }
}

@Composable
private fun CurrencyPickerDialog(
    onSelect: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    var query by remember { mutableStateOf("") }
    val results = remember(query) { CurrencyCatalog.search(query) }
    val focusRequester = remember { FocusRequester() }
    val keyboardController = LocalSoftwareKeyboardController.current

    LaunchedEffect(Unit) {
        kotlinx.coroutines.delay(400)
        try {
            focusRequester.requestFocus()
            keyboardController?.show()
        } catch (_: Exception) {}
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(text = stringResource(R.string.settings_currency)) },
        text = {
            Column {
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    placeholder = { Text(text = stringResource(R.string.settings_currency_search)) },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                    modifier = Modifier
                        .fillMaxWidth()
                        .focusRequester(focusRequester),
                )
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 300.dp)
                        .verticalScroll(rememberScrollState())
                        .padding(top = 8.dp),
                ) {
                    results.forEach { currency ->
                        Text(
                            text = currencyLabel(currency),
                            style = MaterialTheme.typography.bodyLarge,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onSelect(currency.code) }
                                .padding(horizontal = 4.dp, vertical = 12.dp),
                        )
                    }
                    if (results.isEmpty()) {
                        Text(
                            text = stringResource(R.string.settings_currency_empty),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(vertical = 12.dp),
                        )
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(text = stringResource(R.string.cancel))
            }
        },
    )
}

private fun currencyLabel(currency: Currency): String =
    "${currency.code} — ${currency.name} (${currency.symbol})"
