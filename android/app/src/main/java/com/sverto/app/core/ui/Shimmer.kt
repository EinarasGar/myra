package com.sverto.app.core.ui

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.dp

@Composable
fun shimmerBrush(): Brush {
    val baseColor = MaterialTheme.colorScheme.surfaceContainerHighest
    val shimmerColor = MaterialTheme.colorScheme.surfaceBright

    val transition = rememberInfiniteTransition(label = "shimmer")
    val offsetX =
        transition.animateFloat(
            initialValue = -500f,
            targetValue = 1500f,
            animationSpec =
                infiniteRepeatable(
                    animation = tween(durationMillis = 1000, easing = LinearEasing),
                    repeatMode = RepeatMode.Restart,
                ),
            label = "shimmerOffset",
        )

    return Brush.linearGradient(
        colors = listOf(baseColor, shimmerColor, baseColor),
        start = Offset(offsetX.value, 0f),
        end = Offset(offsetX.value + 500f, 0f),
    )
}

@Composable
fun PortfolioChartSkeleton(modifier: Modifier = Modifier) {
    val brush = shimmerBrush()
    Card(
        modifier.fillMaxWidth(),
        colors =
            CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainer,
            ),
    ) {
        Column(Modifier.padding(20.dp)) {
            Box(
                Modifier
                    .width(180.dp)
                    .height(32.dp)
                    .background(brush),
            )

            Spacer(Modifier.height(8.dp))

            Box(
                Modifier
                    .width(140.dp)
                    .height(16.dp)
                    .background(brush),
            )

            Spacer(Modifier.height(16.dp))

            Box(
                Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .background(brush),
            )

            Spacer(Modifier.height(16.dp))

            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                repeat(7) {
                    Box(
                        Modifier
                            .width(48.dp)
                            .height(32.dp)
                            .background(brush),
                    )
                }
            }
        }
    }
}

@Composable
fun TransactionListSkeleton(modifier: Modifier = Modifier) {
    val brush = shimmerBrush()

    Column(modifier) {
        // First group — large, fills most of screen
        DateHeaderSkeleton(brush, 100.dp)

        Surface(
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surfaceContainerHigh,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        ) {
            Column {
                repeat(7) {
                    TransactionRowSkeleton(brush)
                }
            }
        }

        // Second group
        DateHeaderSkeleton(brush, 80.dp)

        Surface(
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surfaceContainerHigh,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        ) {
            Column {
                repeat(4) {
                    TransactionRowSkeleton(brush)
                }
            }
        }
    }
}

@Composable
private fun DateHeaderSkeleton(
    brush: Brush,
    labelWidth: androidx.compose.ui.unit.Dp,
) {
    Box(
        Modifier
            .padding(start = 16.dp, top = 16.dp, bottom = 8.dp)
            .width(labelWidth)
            .height(12.dp)
            .background(brush),
    )
}

@Composable
private fun TransactionRowSkeleton(brush: Brush) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(24.dp)
                .background(brush, CircleShape),
        )
        Spacer(Modifier.width(16.dp))
        Column(Modifier.weight(1f)) {
            Box(
                Modifier
                    .fillMaxWidth(0.6f)
                    .height(16.dp)
                    .background(brush),
            )
            Spacer(Modifier.height(8.dp))
            Box(
                Modifier
                    .fillMaxWidth(0.35f)
                    .height(12.dp)
                    .background(brush),
            )
        }
        Spacer(Modifier.width(16.dp))
        Box(
            Modifier
                .width(56.dp)
                .height(16.dp)
                .background(brush),
        )
    }
}
