package com.sverto.app.feature.transactions.create

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ArrowDownward
import androidx.compose.material.icons.outlined.ArrowUpward
import androidx.compose.material.icons.outlined.SyncAlt
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun DirectionalPanel(
    label: String,
    sign: AmountSign,
    variant: PanelVariant,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val containerColor: Color
    val onContainerColor: Color
    when (variant) {
        PanelVariant.PRIMARY -> {
            containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.55f)
            onContainerColor = MaterialTheme.colorScheme.onPrimaryContainer
        }
        PanelVariant.TERTIARY -> {
            containerColor = MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.55f)
            onContainerColor = MaterialTheme.colorScheme.onTertiaryContainer
        }
    }

    val directionIcon: ImageVector? =
        when (sign) {
            AmountSign.POSITIVE -> Icons.Outlined.ArrowDownward
            AmountSign.NEGATIVE -> Icons.Outlined.ArrowUpward
            AmountSign.ANY -> null
        }

    Surface(
        shape = RoundedCornerShape(28.dp),
        color = containerColor,
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            DirectionBadge(
                label = label.uppercase(),
                icon = directionIcon,
                onContainer = onContainerColor,
            )
            Spacer(Modifier.height(12.dp))
            content()
        }
    }
}

@Composable
private fun DirectionBadge(
    label: String,
    icon: ImageVector?,
    onContainer: Color,
) {
    Surface(
        shape = RoundedCornerShape(percent = 50),
        color = Color.Transparent,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (icon != null) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = onContainer,
                    modifier = Modifier.size(14.dp),
                )
                Spacer(Modifier.width(6.dp))
            }
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
                color = onContainer,
            )
        }
    }
}

enum class PanelVariant { PRIMARY, TERTIARY }

@Composable
fun SwapGlyph(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier.fillMaxWidth().padding(vertical = 4.dp),
        contentAlignment = Alignment.Center,
    ) {
        Surface(
            shape = CircleShape,
            color = MaterialTheme.colorScheme.surface,
            border =
                androidx.compose.foundation.BorderStroke(
                    width = 1.dp,
                    color = MaterialTheme.colorScheme.outlineVariant,
                ),
            modifier = Modifier.size(40.dp),
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = Icons.Outlined.SyncAlt,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
    }
}
