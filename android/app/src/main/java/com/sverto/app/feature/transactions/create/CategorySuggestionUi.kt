package com.sverto.app.feature.transactions.create

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

private const val PULSE_MS = 650
private val BORDER_WIDTH = 2.dp

@Composable
fun Modifier.aiThinkingBorder(
    active: Boolean,
    cornerRadius: Dp,
): Modifier {
    if (!active) return this
    val transition = rememberInfiniteTransition(label = "ai_thinking")
    val pulse =
        transition.animateFloat(
            initialValue = 0.35f,
            targetValue = 1f,
            animationSpec =
                infiniteRepeatable(
                    animation = tween(PULSE_MS, easing = LinearEasing),
                    repeatMode = RepeatMode.Reverse,
                ),
            label = "ai_thinking_pulse",
        )
    val primary = MaterialTheme.colorScheme.primary
    val tertiary = MaterialTheme.colorScheme.tertiary
    return drawWithContent {
        drawContent()
        val strokeWidth = BORDER_WIDTH.toPx()
        val alpha = pulse.value
        drawRoundRect(
            brush = Brush.linearGradient(listOf(primary.copy(alpha = alpha), tertiary.copy(alpha = alpha))),
            topLeft = Offset(strokeWidth / 2, strokeWidth / 2),
            size = Size(size.width - strokeWidth, size.height - strokeWidth),
            cornerRadius = CornerRadius(cornerRadius.toPx() - strokeWidth / 2),
            style = Stroke(width = strokeWidth),
        )
    }
}

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun CategorySuggestionOfferChip(
    name: String,
    onApply: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val motionScheme = MaterialTheme.motionScheme
    val visibleState = remember { MutableTransitionState(false) }
    LaunchedEffect(Unit) { visibleState.targetState = true }
    AnimatedVisibility(
        visibleState = visibleState,
        enter =
            fadeIn(animationSpec = motionScheme.defaultEffectsSpec()) +
                scaleIn(
                    animationSpec = motionScheme.defaultSpatialSpec(),
                    initialScale = 0.8f,
                ) +
                expandVertically(animationSpec = motionScheme.defaultSpatialSpec()),
        modifier = modifier,
    ) {
        AssistChip(
            onClick = onApply,
            leadingIcon = {
                Icon(
                    imageVector = Icons.Default.AutoAwesome,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(AssistChipDefaults.IconSize),
                )
            },
            label = { Text("$name?") },
            colors =
                AssistChipDefaults.assistChipColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerHighest,
                ),
            modifier = Modifier.semantics { contentDescription = "Apply suggested category $name" },
        )
    }
}
