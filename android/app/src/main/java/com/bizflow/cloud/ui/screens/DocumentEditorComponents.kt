package com.bizflow.cloud.ui.screens

import androidx.annotation.StringRes
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.bizflow.cloud.R
import com.bizflow.cloud.data.model.DocumentType
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.math.max

@Composable
fun SectionHeader(
    @StringRes titleRes: Int,
    modifier: Modifier = Modifier,
) {
    Text(
        text = stringResource(titleRes),
        style = MaterialTheme.typography.titleSmall,
        fontWeight = FontWeight.Bold,
        color = MaterialTheme.colorScheme.primary,
        modifier = modifier,
    )
}

@Composable
fun EditorTextField(
    @StringRes labelRes: Int,
    value: String,
    onValueChange: (String) -> Unit,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    modifier: Modifier = Modifier,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(text = stringResource(labelRes)) },
        singleLine = true,
        keyboardOptions = keyboardOptions,
        modifier = modifier.fillMaxWidth(),
    )
}

@Composable
fun DateField(
    @StringRes labelRes: Int,
    value: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    OutlinedTextField(
        value = value,
        onValueChange = {},
        readOnly = true,
        label = { Text(text = stringResource(labelRes)) },
        trailingIcon = { Icon(Icons.Filled.CalendarToday, contentDescription = null) },
        modifier = modifier
            .fillMaxWidth()
            .clickable { onClick() },
    )
}

@Composable
fun EditorItemRow(
    item: EditorItemUi,
    onEdit: () -> Unit,
    onRemove: () -> Unit,
) {
    ListItem(
        headlineContent = { Text(text = item.description) },
        supportingContent = {
            Text(text = "${item.quantity} × ${item.unitPrice}")
        },
        trailingContent = { IconButton(onClick = onRemove) { Icon(Icons.Filled.Delete, contentDescription = null) } },
        modifier = Modifier.clickable { onEdit() },
    )
}

@Composable
fun ItemEditorDialog(
    initial: EditorItemUi,
    onConfirm: (EditorItemUi) -> Unit,
    onDismiss: () -> Unit,
) {
    var description by rememberSaveable { mutableStateOf(initial.description) }
    var quantity by rememberSaveable { mutableStateOf(initial.quantity) }
    var unitPrice by rememberSaveable { mutableStateOf(initial.unitPrice) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(text = stringResource(R.string.editor_items)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                EditorTextField(
                    labelRes = R.string.editor_item_description,
                    value = description,
                    onValueChange = { description = it },
                )
                EditorTextField(
                    labelRes = R.string.editor_item_quantity,
                    value = quantity,
                    onValueChange = { quantity = it },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                )
                EditorTextField(
                    labelRes = R.string.editor_item_price,
                    value = unitPrice,
                    onValueChange = { unitPrice = it },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    onConfirm(
                        initial.copy(
                            description = description,
                            quantity = quantity,
                            unitPrice = unitPrice,
                        )
                    )
                },
            ) {
                Text(text = stringResource(R.string.editor_save))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(text = stringResource(R.string.editor_cancel))
            }
        },
    )
}

@Composable
fun TotalsSection(
    subtotal: Double,
    taxAmount: Double,
    discount: Double,
    total: Double,
    currency: String,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxWidth()) {
        TotalsRow(R.string.editor_subtotal, subtotal, currency)
        TotalsRow(R.string.editor_iva, taxAmount, currency)
        TotalsRow(R.string.editor_discount, discount, currency)
        Spacer(modifier = Modifier.height(4.dp))
        TotalsRow(R.string.editor_total, total, currency, emphasized = true)
    }
}

@Composable
private fun TotalsRow(
    @StringRes labelRes: Int,
    value: Double,
    currency: String,
    emphasized: Boolean = false,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            text = stringResource(labelRes),
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = if (emphasized) FontWeight.Bold else FontWeight.Normal,
        )
        Text(
            text = formatMoney(value, currency),
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = if (emphasized) FontWeight.Bold else FontWeight.Normal,
        )
    }
}
fun computeItemTotal(quantity: String, unitPrice: String): Double =
    (quantity.toDoubleOrNull() ?: 0.0) * (unitPrice.toDoubleOrNull() ?: 0.0)

data class DocumentTotals(
    val subtotal: Double,
    val taxAmount: Double,
    val discount: Double,
    val total: Double,
)

fun computeTotals(
    items: List<EditorItemUi>,
    discount: String,
    taxRate: Double = 0.16,
): DocumentTotals {
    val subtotal = items.sumOf { computeItemTotal(it.quantity, it.unitPrice) }
    val discountValue = discount.toDoubleOrNull() ?: 0.0
    val taxAmount = subtotal * taxRate
    return DocumentTotals(
        subtotal = subtotal,
        taxAmount = taxAmount,
        discount = discountValue,
        total = max(0.0, subtotal + taxAmount - discountValue),
    )
}

@StringRes
fun documentTypeLabelRes(type: String): Int = when (type) {
    DocumentType.INVOICE_RECEIPT -> R.string.document_type_invoice_receipt
    DocumentType.RECEIPT -> R.string.document_type_receipt
    DocumentType.QUOTE -> R.string.document_type_quote
    else -> R.string.document_type_invoice
}

internal fun formatPickerDate(utcMillis: Long): String {
    val offset = TimeZone.getDefault().getOffset(utcMillis)
    return SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date(utcMillis + offset))
}
