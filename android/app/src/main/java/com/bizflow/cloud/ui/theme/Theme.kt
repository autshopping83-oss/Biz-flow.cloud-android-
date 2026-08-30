package com.bizflow.cloud.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val BizFlowLightColorScheme = lightColorScheme(
    primary = BrandPrimary,
    onPrimary = BrandOnPrimary,
    primaryContainer = BrandPrimaryContainer,
    onPrimaryContainer = BrandOnPrimaryContainer,
    secondary = InvoiceReceiptViolet,
    onSecondary = BrandOnPrimary,
    secondaryContainer = Color(0xFFEDE9FE),
    onSecondaryContainer = QuoteVioletDark,
    tertiary = ReceiptEmerald,
    onTertiary = BrandOnPrimary,
    tertiaryContainer = Color(0xFFD1FAE5),
    onTertiaryContainer = Color(0xFF065F46),
    error = Color(0xFFDC2626),
    onError = BrandOnPrimary,
    errorContainer = Color(0xFFFEE2E2),
    onErrorContainer = Color(0xFF7F1D1D),
    background = Slate50,
    onBackground = Slate900,
    surface = Color(0xFFFFFFFF),
    onSurface = Slate900,
    surfaceVariant = Slate200,
    onSurfaceVariant = Slate500,
    surfaceContainerLowest = Color(0xFFFFFFFF),
    surfaceContainerLow = Color(0xFFFFFFFF),
    surfaceContainer = Slate50,
    surfaceContainerHigh = Slate100,
    surfaceContainerHighest = Slate200,
    outline = Slate200,
    outlineVariant = Slate200,
    scrim = Color(0xFF000000),
    inverseSurface = Slate900,
    inverseOnSurface = Slate50,
    inversePrimary = Color(0xFF60A5FA),
)

@Composable
fun BizFlowTheme(
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = BizFlowLightColorScheme,
        typography = Typography,
        shapes = Shapes,
        content = content,
    )
}