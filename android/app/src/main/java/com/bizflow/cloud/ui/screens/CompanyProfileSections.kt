package com.bizflow.cloud.ui.screens

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.bizflow.cloud.R

@Composable
fun ProfileSectionHeader(titleRes: Int) {
    Text(
        text = stringResource(titleRes),
        style = MaterialTheme.typography.titleMedium,
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 16.dp, top = 20.dp, bottom = 4.dp),
    )
}

@Composable
fun ProfileTextField(
    value: String,
    onValueChange: (String) -> Unit,
    labelRes: Int,
    modifier: Modifier = Modifier,
    keyboardType: KeyboardType = KeyboardType.Text,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(text = stringResource(labelRes)) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
    )
}

@Composable
fun IdentitySection(
    logo: @Composable () -> Unit,
    name: String,
    tradingName: String,
    identifierType: String,
    identifierValue: String,
    onName: (String) -> Unit,
    onTradingName: (String) -> Unit,
    onIdentifierType: (String) -> Unit,
    onIdentifierValue: (String) -> Unit,
) {
    ProfileSectionHeader(R.string.settings_section_identity)
    logo()
    ProfileTextField(value = name, onValueChange = onName, labelRes = R.string.settings_company_name)
    ProfileTextField(value = tradingName, onValueChange = onTradingName, labelRes = R.string.settings_company_trading_name)
    ProfileTextField(value = identifierValue, onValueChange = onIdentifierValue, labelRes = R.string.settings_company_identifier)
    ProfileTextField(value = identifierType, onValueChange = onIdentifierType, labelRes = R.string.settings_company_identifier_type)
}

@Composable
fun ContactsSection(
    phone: String,
    whatsApp: String,
    email: String,
    website: String,
    onPhone: (String) -> Unit,
    onWhatsApp: (String) -> Unit,
    onEmail: (String) -> Unit,
    onWebsite: (String) -> Unit,
) {
    ProfileSectionHeader(R.string.settings_section_contacts)
    ProfileTextField(value = phone, onValueChange = onPhone, labelRes = R.string.settings_company_phone)
    ProfileTextField(value = whatsApp, onValueChange = onWhatsApp, labelRes = R.string.settings_company_whatsapp)
    ProfileTextField(
        value = email, onValueChange = onEmail, labelRes = R.string.settings_company_email,
        keyboardType = KeyboardType.Email,
    )
    ProfileTextField(
        value = website, onValueChange = onWebsite, labelRes = R.string.settings_company_website,
        keyboardType = KeyboardType.Uri,
    )
}

@Composable
fun LocationSection(
    country: String,
    city: String,
    address: String,
    onCountry: (String) -> Unit,
    onCity: (String) -> Unit,
    onAddress: (String) -> Unit,
) {
    ProfileSectionHeader(R.string.settings_section_location)
    ProfileTextField(value = country, onValueChange = onCountry, labelRes = R.string.settings_company_country)
    ProfileTextField(value = city, onValueChange = onCity, labelRes = R.string.settings_company_city)
    ProfileTextField(value = address, onValueChange = onAddress, labelRes = R.string.settings_company_address)
}
