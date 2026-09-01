package com.bizflow.cloud.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.bizflow.cloud.R

data class ClientFormData(
    val name: String,
    val contact: String,
    val location: String,
    val identifier: String,
)

@Composable
fun ClientFormDialog(
    initial: ClientFormData,
    onConfirm: (ClientFormData) -> Unit,
    onDismiss: () -> Unit,
    confirmLabelRes: Int = R.string.editor_save,
) {
    var name by rememberSaveable { mutableStateOf(initial.name) }
    var contact by rememberSaveable { mutableStateOf(initial.contact) }
    var location by rememberSaveable { mutableStateOf(initial.location) }
    var identifier by rememberSaveable { mutableStateOf(initial.identifier) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(text = stringResource(R.string.client_new)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                EditorTextField(
                    labelRes = R.string.client_name,
                    value = name,
                    onValueChange = { name = it },
                )
                EditorTextField(
                    labelRes = R.string.client_contact,
                    value = contact,
                    onValueChange = { contact = it },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                )
                EditorTextField(
                    labelRes = R.string.client_location,
                    value = location,
                    onValueChange = { location = it },
                )
                EditorTextField(
                    labelRes = R.string.client_identifier,
                    value = identifier,
                    onValueChange = { identifier = it },
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    onConfirm(ClientFormData(name, contact, location, identifier))
                },
                enabled = name.isNotBlank(),
            ) {
                Text(text = stringResource(confirmLabelRes))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(text = stringResource(R.string.editor_cancel))
            }
        },
    )
}
