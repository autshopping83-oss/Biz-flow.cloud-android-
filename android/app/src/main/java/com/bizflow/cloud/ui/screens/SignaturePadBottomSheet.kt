package com.bizflow.cloud.ui.screens

import android.graphics.Bitmap
import android.graphics.Color as AndroidColor
import android.graphics.Paint
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.asAndroidPath
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import com.bizflow.cloud.R
import java.io.ByteArrayOutputStream

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SignaturePadBottomSheet(
    onConfirmPng: (ByteArray) -> Unit,
    onDismiss: () -> Unit,
) {
    val strokes = remember { mutableStateOf<List<List<Offset>>>(emptyList()) }
    var areaSize by remember { mutableStateOf(IntSize.Zero) }
    val hasDrawing = strokes.value.isNotEmpty()

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(modifier = Modifier.fillMaxWidth().padding(24.dp)) {
            Text(
                text = stringResource(R.string.sign_draw_hint),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 12.dp),
            )
            Canvas(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .border(1.dp, MaterialTheme.colorScheme.outline, MaterialTheme.shapes.medium)
                    .pointerInput(Unit) {
                        detectDragGestures(
                            onDragStart = { start ->
                                strokes.value = strokes.value + listOf(listOf(start))
                            },
                            onDrag = { change, _ ->
                                change.consume()
                                val current = strokes.value
                                val lastIndex = current.lastIndex
                                if (lastIndex >= 0) {
                                    strokes.value = current.toMutableList().also {
                                        it[lastIndex] = it[lastIndex] + change.position
                                    }
                                }
                            },
                        )
                    }
                    .onSizeChanged { areaSize = it },
            ) {
                strokes.value.forEach { strokePoints ->
                    if (strokePoints.isNotEmpty()) {
                        drawPath(
                            path = strokePath(strokePoints),
                            color = Color.Black,
                            style = Stroke(width = 4.dp.toPx(), cap = androidx.compose.ui.graphics.StrokeCap.Round),
                        )
                    }
                }
            }
            Row(modifier = Modifier.fillMaxWidth().padding(top = 16.dp)) {
                TextButton(
                    onClick = { strokes.value = emptyList() },
                    enabled = hasDrawing,
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(Icons.Filled.Delete, contentDescription = null)
                    Text(text = stringResource(R.string.editor_sign_clear))
                }
                Button(
                    onClick = { onConfirmPng(buildPng(strokes.value, areaSize)) },
                    enabled = hasDrawing,
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(Icons.Filled.Check, contentDescription = null)
                    Text(text = stringResource(R.string.editor_save))
                }
            }
        }
    }
}

private fun strokePath(points: List<Offset>): Path {
    return Path().apply {
        moveTo(points.first().x, points.first().y)
        points.drop(1).forEach { lineTo(it.x, it.y) }
    }
}

private fun buildPng(strokes: List<List<Offset>>, size: IntSize): ByteArray {
    val width = size.width.coerceAtLeast(1)
    val height = size.height.coerceAtLeast(1)
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = android.graphics.Canvas(bitmap)
    val paint = Paint().apply {
        color = AndroidColor.BLACK
        style = Paint.Style.STROKE
        strokeWidth = 6f
        isAntiAlias = true
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }
    strokes.forEach { strokePoints ->
        if (strokePoints.isNotEmpty()) {
            canvas.drawPath(strokePath(strokePoints).asAndroidPath(), paint)
        }
    }
    val out = ByteArrayOutputStream()
    bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
    return out.toByteArray()
}