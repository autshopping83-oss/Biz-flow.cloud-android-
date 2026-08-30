package com.bizflow.cloud.ui.screens
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Button
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.bizflow.cloud.R
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateDocumentScreen(
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: CreateDocumentViewModel = viewModel(factory = CreateDocumentViewModel.Factory),
) {
    val ui by viewModel.uiState.collectAsStateWithLifecycle()
    val clients by viewModel.clients.collectAsStateWithLifecycle()
    var showDatePicker by rememberSaveable { mutableStateOf(false) }
    var editingItem by rememberSaveable { mutableStateOf<EditorItemUi?>(null) }
    var showSignaturePad by remember { mutableStateOf(false) }
    val totals = computeTotals(ui.items, ui.discount)
    val canSave = ui.clientName.isNotBlank() && ui.items.isNotEmpty() && !ui.isSaving
    Scaffold(
        modifier = modifier,
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text(text = stringResource(documentTypeLabelRes(ui.type))) },
                navigationIcon = {
                    IconButton(onClick = onClose) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.nav_back),
                        )
                    }
                },
                actions = {
                    if (ui.isGeneratingPreview) {
                        CircularProgressIndicator(
                            modifier = Modifier.padding(horizontal = 16.dp),
                            strokeWidth = 2.dp,
                        )
                    } else {
                        TextButton(
                            onClick = viewModel::requestPreview,
                            enabled = ui.items.isNotEmpty(),
                        ) {
                            Text(text = stringResource(R.string.editor_preview))
                        }
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface,
                ),
            )
        },
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item { TypeSelector(selected = ui.type, onSelect = viewModel::updateType) }
            item {
                ClientDropdown(
                    clients = clients,
                    selectedName = ui.clientName,
                    onSelect = viewModel::selectClient,
                )
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    StatusSelector(
                        selected = ui.status,
                        onSelect = viewModel::updateStatus,
                        modifier = Modifier.weight(1f),
                    )
                    PaymentSelector(
                        selected = ui.paymentMethod,
                        onSelect = viewModel::updatePaymentMethod,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
            item {
                DateField(
                    labelRes = R.string.editor_date,
                    value = ui.date,
                    onClick = { showDatePicker = true },
                )
            }
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    SectionHeader(titleRes = R.string.editor_items, modifier = Modifier.weight(1f))
                    TextButton(
                        onClick = {
                            editingItem = EditorItemUi(id = "", description = "", quantity = "1", unitPrice = "")
                        },
                    ) {
                        Icon(Icons.Filled.Add, contentDescription = null)
                        Text(text = stringResource(R.string.editor_add_item))
                    }
                }
            }
            if (ui.items.isEmpty()) {
                item {
                    Text(
                        text = stringResource(R.string.editor_no_items),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            items(ui.items, key = { it.id }) { item ->
                EditorItemRow(
                    item = item,
                    onEdit = { editingItem = item },
                    onRemove = { viewModel.removeItem(item.id) },
                )
            }
            item {
                EditorTextField(
                    labelRes = R.string.editor_discount,
                    value = ui.discount,
                    onValueChange = viewModel::updateDiscount,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                )
            }
            item {
                TotalsSection(
                    subtotal = totals.subtotal,
                    taxAmount = totals.taxAmount,
                    discount = totals.discount,
                    total = totals.total,
                    currency = "MZN",
                )
            }
            item {
                SignatureSection(
                    signaturePath = ui.signaturePath,
                    onOpenPad = { showSignaturePad = true },
                    onClear = viewModel::clearSignature,
                )
            }
            item {
                Button(
                    onClick = { viewModel.save(onClose) },
                    enabled = canSave,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(text = stringResource(R.string.editor_save))
                }
            }
        }
    }
    if (showDatePicker) {
        val datePickerState = rememberDatePickerState()
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        datePickerState.selectedDateMillis?.let { millis ->
                            viewModel.updateDate(formatPickerDate(millis))
                        }
                        showDatePicker = false
                    },
                ) {
                    Text(text = stringResource(R.string.editor_save))
                }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) {
                    Text(text = stringResource(R.string.editor_cancel))
                }
            },
        ) {
            DatePicker(state = datePickerState)
        }
    }
    editingItem?.let { item ->
        ItemEditorDialog(
            initial = item,
            onConfirm = { updated ->
                if (updated.id.isEmpty()) {
                    viewModel.addItem(updated.description, updated.quantity, updated.unitPrice)
                } else {
                    viewModel.updateItem(updated.id, updated.description, updated.quantity, updated.unitPrice)
                }
                editingItem = null
            },
            onDismiss = { editingItem = null },
        )
    }
    if (showSignaturePad) {
        SignaturePadBottomSheet(
            onConfirmPng = { bytes ->
                viewModel.saveSignature(bytes)
                showSignaturePad = false
            },
            onDismiss = { showSignaturePad = false },
        )
    }
    ui.previewHtml?.let { html ->
        PdfPreviewDialog(
            html = html,
            jobName = stringResource(documentTypeLabelRes(ui.type)),
            onPrint = viewModel::printPreview,
            onDismiss = { viewModel.resetPreview() },
        )
    }
}
