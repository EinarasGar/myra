package com.sverto.app.feature.aichat

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay

private val suggestions =
    listOf(
        "What's my spending this month?",
        "How are my investments performing?",
        "Show my recent transactions",
        "What's my biggest expense category?",
        "How much did I save last month?",
    )

@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun SuggestionChips(
    onSuggestion: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val motionScheme = MaterialTheme.motionScheme
    Column(
        modifier =
            modifier
                .fillMaxSize()
                .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            imageVector = Icons.Default.AutoAwesome,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.primary,
        )

        Spacer(Modifier.height(16.dp))

        Text(
            text = "Ask Myra about your finances",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Spacer(Modifier.height(24.dp))

        FlowRow(
            horizontalArrangement = Arrangement.Center,
        ) {
            suggestions.forEachIndexed { index, suggestion ->
                // Each chip springs/fades in, staggered by index, for an expressive entrance.
                val visibleState = remember { MutableTransitionState(false) }
                LaunchedEffect(Unit) {
                    delay(index * 60L)
                    visibleState.targetState = true
                }
                AnimatedVisibility(
                    visibleState = visibleState,
                    enter =
                        fadeIn(animationSpec = motionScheme.defaultEffectsSpec()) +
                            scaleIn(
                                animationSpec = motionScheme.defaultSpatialSpec(),
                                initialScale = 0.8f,
                            ) +
                            slideInVertically(animationSpec = motionScheme.defaultSpatialSpec()) { it / 4 },
                ) {
                    AssistChip(
                        onClick = { onSuggestion(suggestion) },
                        label = { Text(suggestion) },
                        colors =
                            AssistChipDefaults.assistChipColors(
                                containerColor = MaterialTheme.colorScheme.surfaceContainerHighest,
                            ),
                        modifier = Modifier.padding(4.dp),
                    )
                }
            }
        }
    }
}
