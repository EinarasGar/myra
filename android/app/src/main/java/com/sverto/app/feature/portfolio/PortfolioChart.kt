package com.sverto.app.feature.portfolio

import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.roundToInt

data class ChartPoint(
    val date: Long,
    val value: Double,
)

enum class TimePeriod(
    val label: String,
    val apiRange: String,
) {
    DAY("1D", "1d"),
    WEEK("1W", "1w"),
    MONTH("1M", "1m"),
    THREE_MONTHS("3M", "3m"),
    SIX_MONTHS("6M", "6m"),
    YEAR("1Y", "1y"),
    ALL("ALL", "all"),
}

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun PortfolioChart(
    portfolioData: Map<TimePeriod, List<ChartPoint>>,
    modifier: Modifier = Modifier,
) {
    var selectedPeriod by remember { mutableStateOf(TimePeriod.MONTH) }
    val points = portfolioData[selectedPeriod] ?: emptyList()

    // Scrub state: null = show latest, 0..1 = normalized position
    var scrubPosition by remember { mutableStateOf<Float?>(null) }

    val scrubIdx =
        if (scrubPosition != null && points.isNotEmpty()) {
            (scrubPosition!! * (points.size - 1)).roundToInt().coerceIn(0, points.size - 1)
        } else {
            null
        }

    val currentValue = if (scrubIdx != null) points[scrubIdx].value else points.lastOrNull()?.value ?: 0.0
    val startValue = points.firstOrNull()?.value ?: 0.0
    val changeAmount = currentValue - startValue
    val changePercent = if (startValue != 0.0) (changeAmount / startValue) * 100 else 0.0
    val isPositive = changeAmount >= 0

    val scrubDate =
        if (scrubIdx != null) {
            val dateFormat =
                if (selectedPeriod == TimePeriod.DAY) {
                    SimpleDateFormat("MMM d, h:mm a", Locale.getDefault())
                } else {
                    SimpleDateFormat("MMM d, yyyy", Locale.getDefault())
                }
            dateFormat.format(Date(points[scrubIdx].date * 1000))
        } else {
            null
        }

    val lineColor =
        if (isPositive) {
            MaterialTheme.colorScheme.primary
        } else {
            MaterialTheme.colorScheme.error
        }
    val fillColor =
        if (isPositive) {
            MaterialTheme.colorScheme.primaryContainer
        } else {
            MaterialTheme.colorScheme.errorContainer
        }
    val changeColor =
        if (isPositive) {
            MaterialTheme.colorScheme.primary
        } else {
            MaterialTheme.colorScheme.error
        }

    // Animate line drawing on period change
    val animationProgress = remember { Animatable(0f) }
    LaunchedEffect(selectedPeriod) {
        animationProgress.snapTo(0f)
        animationProgress.animateTo(1f, animationSpec = tween(600))
    }

    Card(
        modifier.fillMaxWidth(),
        colors =
            CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainer,
            ),
    ) {
        Column(Modifier.padding(20.dp)) {
            // Portfolio value
            Text(
                text = "$${formatNumber(currentValue)}",
                style = MaterialTheme.typography.headlineLarge,
                modifier = Modifier.animateContentSize(),
            )

            // Change indicator
            val sign = if (isPositive) "+" else ""
            Text(
                text = "$sign$${formatNumber(changeAmount)} ($sign${String.format(Locale.US, "%.2f", changePercent)}%)",
                style = MaterialTheme.typography.bodyMedium,
                color = changeColor,
            )

            // Date when scrubbing
            if (scrubDate != null) {
                Text(
                    text = scrubDate,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Spacer(Modifier.height(16.dp))

            // Chart
            PortfolioLineCanvas(
                points = points.map { it.value },
                progress = animationProgress.value,
                scrubPosition = scrubPosition,
                lineColor = lineColor,
                fillColor = fillColor,
                onScrub = { scrubPosition = it },
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .height(180.dp),
            )

            Spacer(Modifier.height(16.dp))

            // Time period chips
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                TimePeriod.entries.forEach { period ->
                    FilterChip(
                        selected = selectedPeriod == period,
                        onClick = {
                            selectedPeriod = period
                            scrubPosition = null
                        },
                        label = { Text(period.label) },
                        colors =
                            FilterChipDefaults.filterChipColors(
                                selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                                selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer,
                            ),
                    )
                }
            }
        }
    }
}

@Composable
private fun PortfolioLineCanvas(
    points: List<Double>,
    progress: Float,
    scrubPosition: Float?,
    lineColor: Color,
    fillColor: Color,
    onScrub: (Float?) -> Unit,
    modifier: Modifier = Modifier,
) {
    val scrubDotColor = lineColor
    val scrubLineColor = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f)

    var dragX by remember { mutableFloatStateOf(0f) }

    Canvas(
        modifier
            .pointerInput(Unit) {
                detectHorizontalDragGestures(
                    onDragStart = { offset ->
                        dragX = offset.x
                        onScrub(dragX / size.width)
                    },
                    onDragEnd = { onScrub(null) },
                    onDragCancel = { onScrub(null) },
                    onHorizontalDrag = { change, dragAmount ->
                        change.consume()
                        dragX = (dragX + dragAmount).coerceIn(0f, size.width.toFloat())
                        onScrub(dragX / size.width)
                    },
                )
            }.pointerInput(Unit) {
                detectTapGestures(
                    onPress = { offset ->
                        onScrub(offset.x / size.width)
                        val released = tryAwaitRelease()
                        if (released) onScrub(null)
                    },
                )
            },
    ) {
        if (points.size < 2) return@Canvas

        val maxVal = points.max()
        val minVal = points.min()
        val dataRange = maxVal - minVal
        val midVal = (maxVal + minVal) / 2.0
        // Ensure the Y range is at least 2% of the midpoint so tiny
        // fluctuations don't stretch to fill the entire chart height.
        val minRange = kotlin.math.abs(midVal) * 0.02
        val range = dataRange.coerceAtLeast(minRange).coerceAtLeast(1.0)
        val chartMin = midVal - range / 2.0
        val topPad = 8.dp.toPx()
        val bottomPad = 8.dp.toPx()
        val chartHeight = size.height - topPad - bottomPad

        // Calculate point positions
        val coords =
            points.mapIndexed { i, v ->
                val x = i.toFloat() / (points.size - 1) * size.width
                val y = topPad + chartHeight * (1f - ((v - chartMin) / range).toFloat())
                Offset(x, y)
            }

        // Determine how far to draw based on animation
        val visibleCount = (coords.size * progress).toInt().coerceAtLeast(2)
        val visible = coords.take(visibleCount)

        // Build smooth cubic bezier path
        val linePath = buildSmoothPath(visible)

        // Gradient fill
        val fillPath =
            Path().apply {
                addPath(linePath)
                lineTo(visible.last().x, topPad + chartHeight)
                lineTo(visible.first().x, topPad + chartHeight)
                close()
            }

        drawPath(
            path = fillPath,
            brush =
                Brush.verticalGradient(
                    colors = listOf(fillColor.copy(alpha = 0.5f), fillColor.copy(alpha = 0.0f)),
                    startY = topPad,
                    endY = topPad + chartHeight,
                ),
        )

        // Line
        drawPath(
            path = linePath,
            color = lineColor,
            style = Stroke(width = 2.5.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round),
        )

        // Scrub indicator
        if (scrubPosition != null) {
            val sx = (scrubPosition * size.width).coerceIn(0f, size.width)
            val idx = (scrubPosition * (points.size - 1)).roundToInt().coerceIn(0, points.size - 1)
            val sy = coords[idx].y

            // Vertical line
            drawLine(
                color = scrubLineColor,
                start = Offset(sx, topPad),
                end = Offset(sx, topPad + chartHeight),
                strokeWidth = 1.dp.toPx(),
            )

            // Dot
            drawCircle(color = Color.White, radius = 6.dp.toPx(), center = Offset(sx, sy))
            drawCircle(color = scrubDotColor, radius = 4.dp.toPx(), center = Offset(sx, sy))
        }
    }
}

private fun buildSmoothPath(points: List<Offset>): Path {
    val path = Path()
    if (points.isEmpty()) return path

    path.moveTo(points[0].x, points[0].y)
    for (i in 1 until points.size) {
        val prev = points[i - 1]
        val curr = points[i]
        val cpx = (prev.x + curr.x) / 2f
        if (points.size == 2) {
            path.lineTo(curr.x, curr.y)
        } else {
            path.cubicTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y)
        }
    }
    return path
}

private fun formatNumber(value: Double): String {
    val abs = kotlin.math.abs(value)
    return when {
        abs >= 1_000_000 -> String.format(Locale.US, "%,.0f", value)
        abs >= 1_000 -> String.format(Locale.US, "%,.2f", value)
        else -> String.format(Locale.US, "%.2f", value)
    }
}
