package com.sverto.app.feature.aichat

import androidx.compose.animation.animateColor
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.StartOffset
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

/** Shape shared by assistant bubbles and the working-dots placeholder (22dp with a 6dp tail). */
internal val AssistantBubbleShape = RoundedCornerShape(
    topStart = 22.dp,
    topEnd = 22.dp,
    bottomEnd = 22.dp,
    bottomStart = 6.dp,
)

internal val UserBubbleShape = RoundedCornerShape(
    topStart = 22.dp,
    topEnd = 22.dp,
    bottomEnd = 6.dp,
    bottomStart = 22.dp,
)

/** Three staggered scaling dots inside an assistant bubble — shown before the first token. */
@Composable
fun WorkingDots(modifier: Modifier = Modifier) {
    Surface(
        shape = AssistantBubbleShape,
        color = MaterialTheme.colorScheme.surfaceContainer,
        modifier = modifier,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 18.dp, vertical = 14.dp),
        ) {
            val transition = rememberInfiniteTransition(label = "working-dots")
            repeat(3) { index ->
                val scale by transition.animateFloat(
                    initialValue = 0.5f,
                    targetValue = 1f,
                    animationSpec = infiniteRepeatable(
                        animation = tween(durationMillis = 600, easing = LinearEasing),
                        repeatMode = RepeatMode.Reverse,
                        initialStartOffset = StartOffset(index * 160),
                    ),
                    label = "dot-$index",
                )
                Box(
                    modifier = Modifier
                        .padding(horizontal = 2.5.dp)
                        .size(8.dp)
                        .scale(scale)
                        .clip(RoundedCornerShape(50))
                        .background(MaterialTheme.colorScheme.primary),
                )
            }
        }
    }
}

/** Blinking block caret appended to the streaming assistant reply. */
@Composable
fun StreamingCaret(modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "caret")
    val phase by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1000, easing = LinearEasing),
        ),
        label = "caret-phase",
    )
    Box(
        modifier = modifier
            .padding(start = 3.dp)
            .size(width = 9.dp, height = 18.dp)
            .clip(RoundedCornerShape(2.dp))
            .background(MaterialTheme.colorScheme.primary.copy(alpha = if (phase < 0.5f) 1f else 0f)),
    )
}

/**
 * Color that animates between [onSurfaceVariant] and [primary] while [active], approximating the
 * design's shimmer on live status text. Returns a static [onSurfaceVariant] when not active.
 */
@Composable
fun shimmerTextColor(active: Boolean): Color {
    val rest = MaterialTheme.colorScheme.onSurfaceVariant
    if (!active) return rest
    val highlight = MaterialTheme.colorScheme.primary
    val transition = rememberInfiniteTransition(label = "shimmer")
    val color by transition.animateColor(
        initialValue = rest,
        targetValue = highlight,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 900, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "shimmer-color",
    )
    return color
}
