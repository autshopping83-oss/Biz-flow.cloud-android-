package com.bizflow.cloud.ui.screens

import android.graphics.BitmapFactory
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Draw
import androidx.compose.material.icons.filled.Percent
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.bizflow.cloud.R
import com.bizflow.cloud.ui.more.components.DocumentTemplateSelectorBottomSheet
import com.bizflow.cloud.ui.more.components.pdfTemplateOptions

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CompanySettingsScreen(
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: CompanySettingsViewModel = viewModel(factory = CompanySettingsViewModel.Factory),
) {
    val ui by viewModel.uiState.collectAsStateWithLifecycle()
    var showTemplates by remember { mutableStateOf(false) }
    val logoPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let(viewModel::saveLogoImage)
    }
    val stampPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let(viewModel::saveStampImage)
    }
    val signaturePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let(viewModel::saveSignatureImage)
    }

    LaunchedEffect(Unit) { viewModel.refresh() }

    Scaffold(
        modifier = modifier,
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text(text = stringResource(R.string.more_company_settings)) },
                navigationIcon = {
                    IconButton(onClick = onClose) {
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
                .padding(innerPadding)
                .verticalScroll(rememberScrollState()),
        ) {
            ListItem(
                headlineContent = { Text(text = stringResource(R.string.more_pdf_template)) },
                supportingContent = {
                    Text(text = stringResource(currentTemplateName(ui.templateId)))
                },
                leadingContent = { Icon(Icons.Filled.Description, contentDescription = null) },
                trailingContent = { Icon(Icons.Filled.ChevronRight, contentDescription = null) },
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { showTemplates = true },
            )
            IdentitySection(
                logo = {
                    SettingsImageRow(
                        labelRes = R.string.settings_logo,
                        hintRes = R.string.settings_logo_hint,
                        path = ui.logoPath,
                        icon = { Icon(Icons.Filled.Description, contentDescription = null) },
                        onClick = { logoPicker.launch("image/*") },
                    )
                },
                name = ui.name,
                tradingName = ui.tradingName,
                identifierType = ui.identifierType,
                identifierValue = ui.identifierValue,
                onName = viewModel::updateName,
                onTradingName = viewModel::updateTradingName,
                onIdentifierType = viewModel::updateIdentifierType,
                onIdentifierValue = viewModel::updateIdentifierValue,
            )
            ContactsSection(
                phone = ui.contact,
                whatsApp = ui.whatsApp,
                email = ui.email,
                website = ui.website,
                onPhone = viewModel::updateContact,
                onWhatsApp = viewModel::updateWhatsApp,
                onEmail = viewModel::updateEmail,
                onWebsite = viewModel::updateWebsite,
            )
            LocationSection(
                country = ui.country,
                city = ui.city,
                address = ui.address,
                onCountry = viewModel::updateCountry,
                onCity = viewModel::updateCity,
                onAddress = viewModel::updateAddress,
            )
            ProfileSectionHeader(R.string.settings_section_finance)
            CurrencySelector(
                selectedCode = ui.currency,
                onSelect = viewModel::setCurrency,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            )
            VatRateField(
                rate = ui.defaultTaxRate,
                onRate = viewModel::updateDefaultTaxRate,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
            )
            ProfileSectionHeader(R.string.settings_section_documents)
            SettingsImageRow(
                labelRes = R.string.settings_stamp,
                hintRes = R.string.settings_stamp_hint,
                path = ui.stampPath,
                icon = { Icon(Icons.Filled.Badge, contentDescription = null) },
                onClick = { stampPicker.launch("image/*") },
            )
            SettingsImageRow(
                labelRes = R.string.settings_signature,
                hintRes = R.string.settings_signature_hint,
                path = ui.signaturePath,
                icon = { Icon(Icons.Filled.Draw, contentDescription = null) },
                onClick = { signaturePicker.launch("image/*") },
            )
        }
    }

    if (showTemplates) {
        DocumentTemplateSelectorBottomSheet(
            selectedTemplateId = ui.templateId,
            onTemplateSelected = { templateId ->
                viewModel.setDocumentTemplateId(templateId)
                showTemplates = false
            },
            onDismiss = { showTemplates = false },
        )
    }
}

@Composable
private fun currentTemplateName(templateId: String): Int {
    return pdfTemplateOptions.firstOrNull { it.id == templateId }?.nameRes
        ?: R.string.template_1_modern_name
}

@Composable
private fun VatRateField(
    rate: Double,
    onRate: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var text by rememberSaveable { mutableStateOf(formatRatePercent(rate)) }
    LaunchedEffect(rate) {
        val currentPercent = text.replace(',', '.').toDoubleOrNull()
        val targetPercent = rate * 100.0
        if (currentPercent == null || (currentPercent - targetPercent).let { it < -0.001 || it > 0.001 }) {
            text = formatRatePercent(rate)
        }
    }
    OutlinedTextField(
        value = text,
        onValueChange = { input ->
            text = input.filter { it.isDigit() || it == '.' || it == ',' }
            onRate(text)
        },
        label = { Text(text = stringResource(R.string.settings_vat_rate)) },
        trailingIcon = { Icon(Icons.Filled.Percent, contentDescription = null) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
        modifier = modifier.fillMaxWidth(),
    )
}

private fun formatRatePercent(rate: Double): String {
    val percent = rate * 100.0
    val whole = percent.toInt()
    if (percent == whole.toDouble()) return whole.toString()
    return percent.toString()
}

@Composable
private fun SettingsImageRow(
    labelRes: Int,
    hintRes: Int,
    path: String?,
    icon: @Composable () -> Unit,
    onClick: () -> Unit,
) {
    val preview = remember(path) {
        path?.let { BitmapFactory.decodeFile(it) }
    }
    ListItem(
        headlineContent = { Text(text = stringResource(labelRes)) },
        supportingContent = { Text(text = stringResource(hintRes)) },
        leadingContent = icon,
        trailingContent = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (preview != null) {
                    Image(
                        bitmap = preview.asImageBitmap(),
                        contentDescription = null,
                        modifier = Modifier
                            .size(width = 44.dp, height = 32.dp)
                            .background(MaterialTheme.colorScheme.surfaceContainerHighest, RoundedCornerShape(6.dp)),
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Icon(Icons.Filled.ChevronRight, contentDescription = null)
            }
        },
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
    )
}