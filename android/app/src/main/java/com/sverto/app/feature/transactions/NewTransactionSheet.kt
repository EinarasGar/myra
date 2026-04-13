package com.sverto.app.feature.transactions

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay

private data class GroupPalette(
    val iconTint: Color,
    val containerShapes: Pair<RoundedCornerShape, RoundedCornerShape>,
)

private sealed interface GridItem {
    val animIndex: Int

    data class Header(
        val label: String,
        val isFirst: Boolean,
        override val animIndex: Int,
    ) : GridItem

    data class Card(
        val type: TransactionTypeDefinition,
        val groupIndex: Int,
        val indexInGroup: Int,
        override val animIndex: Int,
    ) : GridItem
}

private val flatGridItems: List<GridItem> =
    buildList {
        var index = 0
        TransactionTypeGroups.forEachIndexed { groupIndex, group ->
            add(GridItem.Header(group.label, groupIndex == 0, index++))
            group.types.forEachIndexed { indexInGroup, type ->
                add(GridItem.Card(type, groupIndex, indexInGroup, index++))
            }
        }
    }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewTransactionSheet(
    onDismiss: () -> Unit,
    onSelectType: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        modifier = modifier,
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        containerColor = MaterialTheme.colorScheme.surface,
    ) {
        Column(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp),
        ) {
            Text(
                text = "New transaction",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = "What did you just do?",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(20.dp))
        }

        val palettes = groupPalettes()

        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 32.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            items(
                items = flatGridItems,
                key = { item ->
                    when (item) {
                        is GridItem.Header -> "header_${item.label}"
                        is GridItem.Card -> item.type.key
                    }
                },
                span = { item ->
                    when (item) {
                        is GridItem.Header -> GridItemSpan(2)
                        is GridItem.Card -> GridItemSpan(1)
                    }
                },
            ) { item ->
                AnimatedItem(index = item.animIndex) {
                    when (item) {
                        is GridItem.Header -> GroupHeader(item)
                        is GridItem.Card -> {
                            val palette = palettes[item.groupIndex]
                            TransactionTypeCard(
                                type = item.type,
                                palette = palette,
                                shape =
                                    if (item.indexInGroup % 2 == 0) {
                                        palette.containerShapes.first
                                    } else {
                                        palette.containerShapes.second
                                    },
                                onClick = { onSelectType(item.type.key) },
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun groupPalettes(): List<GroupPalette> {
    val primary = MaterialTheme.colorScheme.primary
    val tertiary = MaterialTheme.colorScheme.tertiary
    val secondary = MaterialTheme.colorScheme.secondary
    val bold = RoundedCornerShape(28.dp)
    val subtle = RoundedCornerShape(16.dp)
    return remember(primary, tertiary, secondary) {
        listOf(
            GroupPalette(primary, bold to subtle),
            GroupPalette(tertiary, bold to subtle),
            GroupPalette(secondary, bold to subtle),
        )
    }
}

@Composable
private fun GroupHeader(item: GridItem.Header) {
    Text(
        text = item.label,
        style = MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.primary,
        fontWeight = FontWeight.SemiBold,
        modifier =
            Modifier.padding(
                start = 4.dp,
                top = if (!item.isFirst) 12.dp else 0.dp,
                bottom = 4.dp,
            ),
    )
}

@Composable
private fun AnimatedItem(
    index: Int,
    content: @Composable () -> Unit,
) {
    val alpha = remember { Animatable(0f) }
    val translationY = remember { Animatable(24f) }

    LaunchedEffect(Unit) {
        delay(index * 30L)
        alpha.animateTo(
            targetValue = 1f,
            animationSpec =
                spring(
                    dampingRatio = Spring.DampingRatioNoBouncy,
                    stiffness = Spring.StiffnessMedium,
                ),
        )
    }

    LaunchedEffect(Unit) {
        delay(index * 30L)
        translationY.animateTo(
            targetValue = 0f,
            animationSpec =
                spring(
                    dampingRatio = Spring.DampingRatioLowBouncy,
                    stiffness = Spring.StiffnessMedium,
                ),
        )
    }

    Box(
        modifier =
            Modifier
                .alpha(alpha.value)
                .graphicsLayer { this.translationY = translationY.value },
    ) {
        content()
    }
}

@Composable
private fun TransactionTypeCard(
    type: TransactionTypeDefinition,
    palette: GroupPalette,
    shape: RoundedCornerShape,
    onClick: () -> Unit,
) {
    Surface(
        shape = shape,
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
        modifier =
            Modifier
                .fillMaxWidth()
                .clickable(onClick = onClick),
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.Top,
        ) {
            Box(
                modifier =
                    Modifier
                        .size(40.dp)
                        .background(
                            color = palette.iconTint.copy(alpha = 0.16f),
                            shape = RoundedCornerShape(14.dp),
                        ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = type.icon,
                    contentDescription = null,
                    tint = palette.iconTint,
                    modifier = Modifier.size(20.dp),
                )
            }
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = type.label,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    text = type.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}
