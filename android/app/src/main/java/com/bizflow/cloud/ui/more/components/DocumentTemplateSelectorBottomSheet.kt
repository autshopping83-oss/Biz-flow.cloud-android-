package com.bizflow.cloud.ui.more.components

import androidx.annotation.StringRes
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bizflow.cloud.R

data class PdfTemplateOption(
    val id: String,
    @StringRes val nameRes: Int,
    val accent: Color,
)

val pdfTemplateOptions = listOf(
    PdfTemplateOption(id = "template_1_modern", nameRes = R.string.template_1_modern_name, accent = Color(0xFF8CBA22)),
    PdfTemplateOption(id = "template_2_classic", nameRes = R.string.template_2_classic_name, accent = Color(0xFF5B8C00)),
    PdfTemplateOption(id = "template_3_vibrant", nameRes = R.string.template_3_vibrant_name, accent = Color(0xFFFF9800)),
)

@Composable
fun TemplateCarousel(
    selectedTemplateId: String,
    onTemplateSelected: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val listState = rememberLazyListState()

    LazyRow(
        state = listState,
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 16.dp),
    ) {
        items(pdfTemplateOptions) { option ->
            val selected = option.id == selectedTemplateId
            TemplatePreviewCard(
                option = option,
                selected = selected,
                onClick = { onTemplateSelected(option.id) },
            )
        }
    }
}

@Composable
private fun TemplatePreviewCard(
    option: PdfTemplateOption,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val borderColor = if (selected) option.accent else MaterialTheme.colorScheme.outlineVariant
    val borderWidth = if (selected) 2.5.dp else 1.dp

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable(onClick = onClick),
    ) {
        Box(contentAlignment = Alignment.TopEnd) {
            Card(
                modifier = Modifier.size(width = 120.dp, height = 170.dp),
                shape = RoundedCornerShape(6.dp),
                border = BorderStroke(borderWidth, borderColor),
                elevation = CardDefaults.cardElevation(
                    defaultElevation = if (selected) 6.dp else 2.dp,
                ),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            ) {
                when (option.id) {
                    "template_1_modern" -> ModernGreenPreview()
                    "template_2_classic" -> ClassicBluePreview()
                    "template_3_vibrant" -> VibrantOrangePreview()
                }
            }
            if (selected) {
                Box(
                    modifier = Modifier
                        .padding(4.dp)
                        .size(22.dp)
                        .background(option.accent, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Filled.Check,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(14.dp),
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = stringResource(option.nameRes),
            style = MaterialTheme.typography.labelSmall,
            color = if (selected) option.accent else MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun ModernGreenPreview() {
    val green = Color(0xFF8CBA22)
    val darkHeader = Color(0xFF1E252B)
    val textMeasurer = rememberTextMeasurer()
    val labelStyle = TextStyle(fontSize = 4.sp, color = Color.White)

    Box(modifier = Modifier.fillMaxWidth().background(Color.White)) {
        androidx.compose.foundation.Canvas(modifier = Modifier.fillMaxWidth().height(170.dp)) {
            val w = size.width
            val h = size.height
            val pad = 6.dp.toPx()

            // Header bar
            drawRect(color = darkHeader, topLeft = Offset.Zero, size = Size(w, h * 0.28f))
            drawRect(
                color = green,
                topLeft = Offset(0f, h * 0.28f - 3.dp.toPx()),
                size = Size(w, 3.dp.toPx()),
            )

            // Company name placeholder in header
            drawRoundRect(
                color = Color.White.copy(alpha = 0.85f),
                topLeft = Offset(pad, 8.dp.toPx()),
                size = Size(w * 0.45f, 6.dp.toPx()),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(2.dp.toPx()),
            )

            // Doc title in header
            drawRoundRect(
                color = green.copy(alpha = 0.7f),
                topLeft = Offset(w * 0.55f, 6.dp.toPx()),
                size = Size(w * 0.38f, 7.dp.toPx()),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(2.dp.toPx()),
            )

            // Info boxes below header
            val boxY = h * 0.30f
            drawRoundRect(
                color = Color(0xFFF8F9FA),
                topLeft = Offset(pad, boxY),
                size = Size(w * 0.44f, h * 0.12f),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(2.dp.toPx()),
            )
            drawRect(
                color = green,
                topLeft = Offset(pad, boxY),
                size = Size(2.dp.toPx(), h * 0.12f),
            )
            drawRoundRect(
                color = Color(0xFFF8F9FA),
                topLeft = Offset(w * 0.52f, boxY),
                size = Size(w * 0.44f, h * 0.12f),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(2.dp.toPx()),
            )
            drawRect(
                color = green,
                topLeft = Offset(w * 0.52f, boxY),
                size = Size(2.dp.toPx(), h * 0.12f),
            )

            // Table header
            val tableY = h * 0.46f
            drawRoundRect(
                color = green,
                topLeft = Offset(pad, tableY),
                size = Size(w - pad * 2, h * 0.07f),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(2.dp.toPx()),
            )

            // Table rows
            for (i in 0..2) {
                val rowY = tableY + h * 0.07f + (i * h * 0.07f)
                if (rowY + h * 0.05f < h - 10.dp.toPx()) {
                    drawRoundRect(
                        color = Color(0xFFF5F5F5),
                        topLeft = Offset(pad, rowY),
                        size = Size(w - pad * 2, h * 0.055f),
                        cornerRadius = androidx.compose.ui.geometry.CornerRadius(1.dp.toPx()),
                    )
                    // Row text placeholder
                    drawRoundRect(
                        color = Color(0xFFCCCCCC),
                        topLeft = Offset(pad + 3.dp.toPx(), rowY + 2.dp.toPx()),
                        size = Size(w * 0.35f, 3.dp.toPx()),
                        cornerRadius = androidx.compose.ui.geometry.CornerRadius(1.dp.toPx()),
                    )
                    drawRoundRect(
                        color = Color(0xFFCCCCCC),
                        topLeft = Offset(w * 0.72f, rowY + 2.dp.toPx()),
                        size = Size(w * 0.18f, 3.dp.toPx()),
                        cornerRadius = androidx.compose.ui.geometry.CornerRadius(1.dp.toPx()),
                    )
                }
            }

            // Total bar
            drawRoundRect(
                color = green,
                topLeft = Offset(w * 0.55f, h * 0.76f),
                size = Size(w * 0.39f, h * 0.07f),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(2.dp.toPx()),
            )
        }
    }
}

@Composable
private fun ClassicBluePreview() {
    val green = Color(0xFF5B8C00)
    val darkFooter = Color(0xFF2B3A4A)

    Box(modifier = Modifier.fillMaxWidth().background(Color.White)) {
        androidx.compose.foundation.Canvas(modifier = Modifier.fillMaxWidth().height(170.dp)) {
            val w = size.width
            val h = size.height
            val pad = 8.dp.toPx()

            // Top header line
            drawRect(
                color = darkFooter,
                topLeft = Offset(0f, 0f),
                size = Size(w, 2.dp.toPx()),
            )

            // Company name
            drawRoundRect(
                color = Color(0xFF333333),
                topLeft = Offset(pad, 6.dp.toPx()),
                size = Size(w * 0.4f, 5.dp.toPx()),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(1.dp.toPx()),
            )

            // Doc title
            drawRoundRect(
                color = green,
                topLeft = Offset(w * 0.55f, 6.dp.toPx()),
                size = Size(w * 0.38f, 6.dp.toPx()),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(2.dp.toPx()),
            )

            // Address boxes
            val addrY = h * 0.14f
            drawRoundRect(
                color = Color(0xFFF8FAFC),
                topLeft = Offset(pad, addrY),
                size = Size(w * 0.44f, h * 0.13f),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(2.dp.toPx()),
            )
            drawRect(
                color = Color(0xFFE2E8F0),
                topLeft = Offset(pad, addrY),
                size = Size(w * 0.44f, h * 0.13f),
                style = Stroke(width = 1.dp.toPx()),
            )
            drawRoundRect(
                color = Color(0xFFF8FAFC),
                topLeft = Offset(w * 0.52f, addrY),
                size = Size(w * 0.44f, h * 0.13f),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(2.dp.toPx()),
            )
            drawRect(
                color = Color(0xFFE2E8F0),
                topLeft = Offset(w * 0.52f, addrY),
                size = Size(w * 0.44f, h * 0.13f),
                style = Stroke(width = 1.dp.toPx()),
            )

            // Table header
            val tableY = h * 0.32f
            drawRoundRect(
                color = green,
                topLeft = Offset(pad, tableY),
                size = Size(w - pad * 2, h * 0.07f),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(2.dp.toPx()),
            )

            // Table rows
            for (i in 0..2) {
                val rowY = tableY + h * 0.07f + (i * h * 0.07f)
                if (rowY + h * 0.05f < h - 14.dp.toPx()) {
                    drawRoundRect(
                        color = Color(0xFFF8FAFC),
                        topLeft = Offset(pad, rowY),
                        size = Size(w - pad * 2, h * 0.055f),
                        cornerRadius = androidx.compose.ui.geometry.CornerRadius(1.dp.toPx()),
                    )
                    drawRoundRect(
                        color = Color(0xFFE2E8F0),
                        topLeft = Offset(pad, rowY),
                        size = Size(w - pad * 2, h * 0.055f),
                        style = Stroke(width = 0.5.dp.toPx()),
                    )
                }
            }

            // Grand total
            drawRoundRect(
                color = green,
                topLeft = Offset(w * 0.58f, h * 0.74f),
                size = Size(w * 0.36f, h * 0.06f),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(2.dp.toPx()),
            )

            // Footer bar
            drawRect(
                color = darkFooter,
                topLeft = Offset(0f, h - 12.dp.toPx()),
                size = Size(w, 12.dp.toPx()),
            )
        }
    }
}

@Composable
private fun VibrantOrangePreview() {
    val orange = Color(0xFFFF9800)
    val darkHeader = Color(0xFF263238)

    Box(modifier = Modifier.fillMaxWidth().background(Color.White)) {
        androidx.compose.foundation.Canvas(modifier = Modifier.fillMaxWidth().height(170.dp)) {
            val w = size.width
            val h = size.height
            val pad = 8.dp.toPx()

            // Dark top header
            drawRect(color = darkHeader, topLeft = Offset.Zero, size = Size(w, h * 0.24f))

            // Company name (orange)
            drawRoundRect(
                color = orange.copy(alpha = 0.8f),
                topLeft = Offset(pad, 8.dp.toPx()),
                size = Size(w * 0.4f, 5.dp.toPx()),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(1.dp.toPx()),
            )

            // Doc badge (orange rectangle on right)
            drawRoundRect(
                color = orange,
                topLeft = Offset(w * 0.62f, 5.dp.toPx()),
                size = Size(w * 0.32f, 10.dp.toPx()),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(2.dp.toPx()),
            )

            // Content area
            val contentY = h * 0.26f

            // Client info placeholder
            drawRoundRect(
                color = Color(0xFFCCCCCC),
                topLeft = Offset(pad, contentY),
                size = Size(w * 0.45f, 4.dp.toPx()),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(1.dp.toPx()),
            )

            // Table header
            val tableY = contentY + 12.dp.toPx()
            drawRoundRect(
                color = darkHeader,
                topLeft = Offset(pad, tableY),
                size = Size(w - pad * 2, h * 0.07f),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(2.dp.toPx()),
            )

            // Table rows
            for (i in 0..2) {
                val rowY = tableY + h * 0.07f + (i * h * 0.065f)
                if (rowY + h * 0.05f < h - 16.dp.toPx()) {
                    drawRoundRect(
                        color = Color(0xFFFAFAFA),
                        topLeft = Offset(pad, rowY),
                        size = Size(w - pad * 2, h * 0.05f),
                        cornerRadius = androidx.compose.ui.geometry.CornerRadius(1.dp.toPx()),
                    )
                    drawRect(
                        color = Color(0xFFCFD8DC),
                        topLeft = Offset(pad, rowY),
                        size = Size(w - pad * 2, h * 0.05f),
                        style = Stroke(width = 0.5.dp.toPx()),
                    )
                }
            }

            // Total card
            drawRoundRect(
                color = Color(0xFFECEFF1),
                topLeft = Offset(w * 0.55f, h * 0.72f),
                size = Size(w * 0.4f, h * 0.12f),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(2.dp.toPx()),
            )
            drawRect(
                color = orange,
                topLeft = Offset(w * 0.55f, h * 0.72f),
                size = Size(w * 0.4f, 3.dp.toPx()),
            )

            // Bottom dark bar
            drawRect(
                color = darkHeader,
                topLeft = Offset(0f, h - 8.dp.toPx()),
                size = Size(w, 8.dp.toPx()),
            )
        }
    }
}
