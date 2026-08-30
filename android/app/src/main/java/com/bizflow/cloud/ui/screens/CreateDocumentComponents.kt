package com.bizflow.cloud.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Draw
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import com.bizflow.cloud.R
import com.bizflow.cloud.data.local.entity.ClientEntity
import com.bizflow.cloud.data.model.DocumentStatus
import com.bizflow.cloud.data.model.DocumentType

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TypeSelector(
    selected: DocumentType,
    onSelect: (DocumentType) -> Unit,
) {
    val options = DocumentType.entries
    SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
        options.forEachIndexed { index, type ->
            SegmentedButton(
                selected = type == selected,
                onClick = { onSelect(type) },
                shape = SegmentedButtonDefaults.itemShape(index = index, count = options.size),
                label = { Text(text = type.prefix) },
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientDropdown(
    clients: List<ClientEntity>,
    selectedName: String,
    onSelect: (ClientEntity) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    var query by rememberSaveable { mutableStateOf(selectedName) }
    val filtered = remember(clients, query) {
        val q = query.trim()
        if (q.isEmpty()) clients else clients.filter {
            it.name.contains(q, ignoreCase = true) ||
                (it.contact != null && it.contact.contains(q, ignoreCase = true))
        }
    }
    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = it },
    ) {
        OutlinedTextField(
            value = query,
            onValueChange = {
                query = it
                expanded = true
            },
            label = { Text(text = stringResource(R.string.editor_client)) },
            singleLine = true,
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier
                .fillMaxWidth()
                .menuAnchor(MenuAnchorType.PrimaryEditable),
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = {
                expanded = false
                query = selectedName
            },
        ) {
            if (filtered.isEmpty()) {
                DropdownMenuItem(
                    text = { Text(text = stringResource(R.string.editor_no_clients)) },
                    enabled = false,
                    onClick = {},
                )
            }
            filtered.forEach { client ->
                DropdownMenuItem(
                    text = {
                        Text(
                            text = client.name,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    },
                    onClick = {
                        onSelect(client)
                        query = client.name
                        expanded = false
                    },
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StatusSelector(
    selected: DocumentStatus,
    onSelect: (DocumentStatus) -> Unit,
    modifier: Modifier = Modifier,
) {
    val options = listOf(
        stringResource(R.string.status_pending) to { onSelect(DocumentStatus.PENDENTE) },
        stringResource(R.string.status_issued) to { onSelect(DocumentStatus.EMITIDO) },
        stringResource(R.string.status_paid) to { onSelect(DocumentStatus.PAGO) },
        stringResource(R.string.status_cancelled) to { onSelect(DocumentStatus.ANULADO) },
    )
    DropdownSelector(
        labelRes = R.string.editor_status,
        value = stringResource(statusLabelRes(selected)),
        options = options,
        modifier = modifier,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentSelector(
    selected: String?,
    onSelect: (String?) -> Unit,
    modifier: Modifier = Modifier,
) {
    val cash = stringResource(R.string.payment_cash)
    val card = stringResource(R.string.payment_card)
    val transfer = stringResource(R.string.payment_transfer)
    val mpesa = stringResource(R.string.payment_mpesa)
    val emola = stringResource(R.string.payment_emola)
    val none = stringResource(R.string.editor_payment_none)
    val options = listOf(
        cash to { onSelect(cash) },
        card to { onSelect(card) },
        transfer to { onSelect(transfer) },
        mpesa to { onSelect(mpesa) },
        emola to { onSelect(emola) },
        none to { onSelect(null) },
    )
    DropdownSelector(
        labelRes = R.string.editor_payment,
        value = selected ?: none,
        options = options,
        modifier = modifier,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DropdownSelector(
    labelRes: Int,
    value: String,
    options: List<Pair<String, () -> Unit>>,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = it },
        modifier = modifier.fillMaxWidth(),
    ) {
        OutlinedTextField(
            value = value,
            onValueChange = {},
            label = { Text(text = stringResource(labelRes)) },
            readOnly = true,
            singleLine = true,
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier
                .fillMaxWidth()
                .menuAnchor(MenuAnchorType.PrimaryNotEditable),
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            options.forEach { (label, action) ->
                DropdownMenuItem(
                    text = { Text(text = label) },
                    onClick = {
                        action()
                        expanded = false
                    },
                )
            }
        }
    }
}

@Composable
fun SignatureSection(
    signaturePath: String?,
    onOpenPad: () -> Unit,
    onClear: () -> Unit,
) {
    ListItem(
        headlineContent = { Text(text = stringResource(R.string.editor_sign)) },
        leadingContent = { Icon(Icons.Filled.Draw, contentDescription = null) },
        trailingContent = {
            if (signaturePath != null) {
                IconButton(onClick = onClear) {
                    Icon(Icons.Filled.Delete, contentDescription = null)
                }
            }
        },
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onOpenPad),
    )
}