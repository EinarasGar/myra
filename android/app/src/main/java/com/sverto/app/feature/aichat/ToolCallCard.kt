package com.sverto.app.feature.aichat

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.LoadingIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp

private enum class ToolPhase { RUNNING, DONE, APPROVAL, DENIED, ERROR }

private fun toolPhaseOf(state: String): ToolPhase =
    when (state) {
        "output-available" -> ToolPhase.DONE
        "approval-requested" -> ToolPhase.APPROVAL
        "output-denied" -> ToolPhase.DENIED
        "output-error" -> ToolPhase.ERROR
        else -> ToolPhase.RUNNING // input-streaming / input-available / approval-responded
    }

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ToolCallCard(
    name: String,
    params: String,
    state: String,
    output: String?,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    val phase = toolPhaseOf(state)
    val motionScheme = MaterialTheme.motionScheme

    val chevronRotation by animateFloatAsState(
        targetValue = if (expanded) 180f else 0f,
        animationSpec = motionScheme.defaultSpatialSpec(),
        label = "toolcall-chevron",
    )

    Surface(
        onClick = { expanded = !expanded },
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        modifier = modifier.fillMaxWidth(),
    ) {
        Column {
            Row(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                LeadingTile(phase)
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Build,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(14.dp),
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            text = name,
                            style = MaterialTheme.typography.titleSmall,
                            fontFamily = FontFamily.Monospace,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                    }
                    Spacer(Modifier.height(2.dp))
                    Text(
                        text = statusLabel(phase),
                        style = MaterialTheme.typography.bodySmall,
                        color =
                            if (phase == ToolPhase.RUNNING) {
                                shimmerTextColor(active = true)
                            } else {
                                statusColor(phase)
                            },
                    )
                }
                Icon(
                    imageVector = Icons.Default.ArrowDropDown,
                    contentDescription = if (expanded) "Collapse" else "Expand",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier =
                        Modifier
                            .size(20.dp)
                            .rotate(chevronRotation),
                )
            }

            AnimatedVisibility(
                visible = expanded,
                enter = expandVertically(animationSpec = motionScheme.defaultSpatialSpec()),
                exit = shrinkVertically(animationSpec = motionScheme.defaultSpatialSpec()),
            ) {
                Column(modifier = Modifier.padding(start = 14.dp, end = 14.dp, bottom = 14.dp)) {
                    CodeBox(caption = "PARAMETERS", body = formatJson(params))
                    if (output != null) {
                        Spacer(Modifier.height(8.dp))
                        CodeBox(caption = "RESULT", body = formatJson(output))
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun LeadingTile(phase: ToolPhase) {
    val (tileColor, contentColor) =
        when (phase) {
            ToolPhase.RUNNING ->
                MaterialTheme.colorScheme.secondaryContainer to
                    MaterialTheme.colorScheme.onSecondaryContainer
            ToolPhase.DONE ->
                MaterialTheme.colorScheme.primaryContainer to
                    MaterialTheme.colorScheme.onPrimaryContainer
            ToolPhase.APPROVAL ->
                MaterialTheme.colorScheme.tertiaryContainer to
                    MaterialTheme.colorScheme.onTertiaryContainer
            ToolPhase.DENIED ->
                MaterialTheme.colorScheme.surfaceContainerHighest to
                    MaterialTheme.colorScheme.onSurfaceVariant
            ToolPhase.ERROR ->
                MaterialTheme.colorScheme.errorContainer to
                    MaterialTheme.colorScheme.onErrorContainer
        }
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = tileColor,
        modifier = Modifier.size(38.dp),
    ) {
        Box(contentAlignment = Alignment.Center) {
            if (phase == ToolPhase.RUNNING) {
                LoadingIndicator(
                    modifier = Modifier.size(20.dp),
                    color = contentColor,
                )
            } else {
                Icon(
                    imageVector = phaseIcon(phase),
                    contentDescription = null,
                    tint = contentColor,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
    }
}

@Composable
private fun CodeBox(
    caption: String,
    body: String,
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceContainer,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
            Text(
                text = caption,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                text = body,
                style = MaterialTheme.typography.bodySmall,
                fontFamily = FontFamily.Monospace,
                color = MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}

private fun phaseIcon(phase: ToolPhase): ImageVector =
    when (phase) {
        ToolPhase.DONE -> Icons.Default.Check
        ToolPhase.APPROVAL -> Icons.Default.Schedule
        ToolPhase.DENIED -> Icons.Default.Cancel
        ToolPhase.ERROR -> Icons.Default.ErrorOutline
        ToolPhase.RUNNING -> Icons.Default.Build
    }

private fun statusLabel(phase: ToolPhase): String =
    when (phase) {
        ToolPhase.RUNNING -> "Running…"
        ToolPhase.DONE -> "Complete"
        ToolPhase.APPROVAL -> "Approval needed"
        ToolPhase.DENIED -> "Denied"
        ToolPhase.ERROR -> "Error"
    }

@Composable
private fun statusColor(phase: ToolPhase): Color =
    when (phase) {
        ToolPhase.DENIED, ToolPhase.ERROR -> MaterialTheme.colorScheme.error
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }

private fun formatJson(json: String): String =
    try {
        val sb = StringBuilder()
        var indent = 0
        var inString = false
        for (ch in json) {
            when {
                ch == '"' -> {
                    inString = !inString
                    sb.append(ch)
                }
                ch == '{' || ch == '[' -> {
                    sb.append(ch)
                    if (!inString) {
                        sb.append('\n')
                        indent++
                        sb.append("  ".repeat(indent))
                    }
                }
                ch == '}' || ch == ']' -> {
                    if (!inString) {
                        indent--
                        sb.append('\n')
                        sb.append("  ".repeat(indent))
                    }
                    sb.append(ch)
                }
                ch == ',' && !inString -> {
                    sb.append(ch)
                    sb.append('\n')
                    sb.append("  ".repeat(indent))
                }
                ch == ':' && !inString -> {
                    sb.append(": ")
                }
                else -> sb.append(ch)
            }
        }
        sb.toString().trim()
    } catch (_: Exception) {
        json
    }
