package com.sverto.app.feature.transactions

import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Layers
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.sverto.app.core.ui.RowDivider
import uniffi.sverto_core.TransactionListItem
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

@OptIn(
    ExperimentalMaterial3Api::class,
    ExperimentalSharedTransitionApi::class,
)
@Composable
@Suppress("LongParameterList", "LongMethod", "ModifierMissing")
fun TransactionDetailScreen(
    transaction: TransactionListItem,
    isInGroup: Boolean,
    onBack: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onChildClick: (TransactionListItem) -> Unit,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
) {
    with(sharedTransitionScope) {
        var showDeleteConfirmation by remember { mutableStateOf(false) }
        val quickActionLabel = if (isInGroup) "Ungroup" else "Group"

        Surface(
            modifier =
                Modifier
                    .fillMaxSize()
                    .sharedBounds(
                        sharedContentState = rememberSharedContentState(key = "tx_${transaction.id}"),
                        animatedVisibilityScope = animatedVisibilityScope,
                    ),
            color = MaterialTheme.colorScheme.surfaceContainer,
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                Column(
                    modifier =
                        Modifier
                            .weight(1f)
                            .verticalScroll(rememberScrollState()),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    HeroHeader(
                        transaction = transaction,
                        onBack = onBack,
                    )

                    Text(
                        text = transaction.description,
                        modifier =
                            Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 24.dp),
                        style = MaterialTheme.typography.headlineLarge,
                        fontWeight = FontWeight.Medium,
                        textAlign = TextAlign.Center,
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis,
                    )

                    Spacer(Modifier.height(6.dp))

                    Text(
                        text = transaction.typeLabel,
                        style = MaterialTheme.typography.titleSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )

                    Spacer(Modifier.height(18.dp))

                    Text(
                        text = transaction.amountDisplay,
                        style = MaterialTheme.typography.displayMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface,
                    )

                    transaction.secondaryAmountDisplay?.let { secondary ->
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = signedSecondary(secondary),
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }

                    if (transaction.accountName.isNotEmpty() || transaction.categoryName.isNotEmpty()) {
                        Spacer(Modifier.height(14.dp))
                        TransactionMetaRow(
                            accountName = transaction.accountName,
                            secondaryAccountName = transaction.secondaryAccountName,
                            categoryName = transaction.categoryName,
                        )
                    }

                    Spacer(Modifier.height(24.dp))
                    QuickActionRow(
                        quickActionLabel = quickActionLabel,
                        onEdit = onEdit,
                        onGroup = {},
                        onShare = {},
                        onDelete = { showDeleteConfirmation = true },
                        modifier = Modifier.padding(horizontal = 16.dp),
                    )

                    Spacer(Modifier.height(28.dp))

                    Surface(
                        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
                        color = MaterialTheme.colorScheme.surfaceBright,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(
                            modifier = Modifier.padding(top = 8.dp, bottom = 24.dp),
                        ) {
                            DetailRow(label = "Date", value = formatDetailDate(transaction.date))

                            if (transaction.accountName.isNotEmpty()) {
                                RowDivider()
                                val destinationAccount = transaction.secondaryAccountName
                                if (!destinationAccount.isNullOrEmpty()) {
                                    DetailRow(label = "From", value = transaction.accountName)
                                    RowDivider()
                                    DetailRow(label = "To", value = destinationAccount)
                                } else {
                                    DetailRow(label = "Account", value = transaction.accountName)
                                }
                            }

                            if (transaction.assetDisplay.isNotEmpty()) {
                                RowDivider()
                                DetailRow(label = "Asset", value = transaction.assetDisplay)
                            }

                            if (transaction.categoryName.isNotEmpty()) {
                                RowDivider()
                                DetailRow(label = "Category", value = transaction.categoryName)
                            }

                            RowDivider()
                            DetailRow(label = "Type", value = transaction.typeLabel)

                            if (transaction.isGroup && transaction.children.isNotEmpty()) {
                                Spacer(Modifier.height(20.dp))

                                Text(
                                    text = "Transactions",
                                    style = MaterialTheme.typography.titleMedium,
                                    modifier = Modifier.padding(horizontal = 16.dp),
                                )

                                Spacer(Modifier.height(12.dp))

                                Surface(
                                    shape = RoundedCornerShape(24.dp),
                                    color = MaterialTheme.colorScheme.surfaceContainer,
                                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                                ) {
                                    Column {
                                        transaction.children.forEachIndexed { index, child ->
                                            ChildTransactionRow(
                                                child = child,
                                                onClick = { onChildClick(child) },
                                                sharedTransitionScope = sharedTransitionScope,
                                                animatedVisibilityScope = animatedVisibilityScope,
                                            )
                                            if (index < transaction.children.lastIndex) {
                                                RowDivider()
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if (showDeleteConfirmation) {
            AlertDialog(
                onDismissRequest = { showDeleteConfirmation = false },
                title = { Text("Delete transaction?") },
                text = { Text("This action can’t be undone.") },
                confirmButton = {
                    TextButton(
                        onClick = {
                            showDeleteConfirmation = false
                            onDelete()
                        },
                    ) {
                        Text("Delete")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showDeleteConfirmation = false }) {
                        Text("Cancel")
                    }
                },
            )
        }
    }
}

@Composable
private fun HeroHeader(
    transaction: TransactionListItem,
    onBack: () -> Unit,
) {
    Box(
        modifier =
            Modifier
                .fillMaxWidth()
                .height(296.dp),
    ) {
        Box(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .height(248.dp)
                    .align(Alignment.TopCenter)
                    .background(
                        brush =
                            Brush.linearGradient(
                                listOf(
                                    MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.95f),
                                    MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.9f),
                                    MaterialTheme.colorScheme.surfaceContainerHighest.copy(alpha = 0.92f),
                                ),
                            ),
                        shape = RoundedCornerShape(bottomStart = 36.dp, bottomEnd = 36.dp),
                    ),
        ) {
            TransactionGlyph(
                transaction = transaction,
                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f),
                modifier =
                    Modifier
                        .size(176.dp)
                        .align(Alignment.CenterEnd)
                        .offset(x = (-18).dp, y = 6.dp)
                        .graphicsLayer { rotationZ = -14f },
            )
        }

        FilledTonalIconButton(
            onClick = onBack,
            colors =
                IconButtonDefaults.filledTonalIconButtonColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainer.copy(alpha = 0.9f),
                ),
            modifier =
                Modifier
                    .align(Alignment.TopStart)
                    .statusBarsPadding()
                    .padding(start = 16.dp, top = 12.dp)
                    .size(46.dp),
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Back",
            )
        }

        Surface(
            shape = CircleShape,
            color = MaterialTheme.colorScheme.primaryContainer,
            shadowElevation = 4.dp,
            modifier =
                Modifier
                    .align(Alignment.BottomCenter)
                    .size(96.dp),
        ) {
            Box(contentAlignment = Alignment.Center) {
                TransactionGlyph(
                    transaction = transaction,
                    tint = MaterialTheme.colorScheme.onPrimaryContainer,
                    modifier = Modifier.size(40.dp),
                )
            }
        }
    }
}

@Composable
private fun TransactionMetaRow(
    accountName: String,
    secondaryAccountName: String?,
    categoryName: String,
) {
    Row(
        modifier = Modifier.padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (accountName.isNotEmpty()) {
            MetaChip(accountName)
        }
        if (!secondaryAccountName.isNullOrEmpty()) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                contentDescription = "to",
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(18.dp),
            )
            MetaChip(secondaryAccountName)
        }
        if (categoryName.isNotEmpty()) {
            MetaChip(categoryName)
        }
    }
}

@Composable
private fun MetaChip(label: String) {
    Surface(
        shape = RoundedCornerShape(999.dp),
        color = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.75f),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSecondaryContainer,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
        )
    }
}

@Composable
private fun QuickActionRow(
    quickActionLabel: String,
    onEdit: () -> Unit,
    onGroup: () -> Unit,
    onShare: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.Top,
    ) {
        QuickActionButton(
            icon = Icons.Outlined.Edit,
            label = "Edit",
            onClick = onEdit,
        )
        QuickActionButton(
            icon = Icons.Outlined.Layers,
            label = quickActionLabel,
            onClick = onGroup,
        )
        QuickActionButton(
            icon = Icons.Outlined.Share,
            label = "Share",
            onClick = onShare,
        )
        QuickActionButton(
            icon = Icons.Outlined.Delete,
            label = "Delete",
            onClick = onDelete,
            destructive = true,
        )
    }
}

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun QuickActionButton(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    destructive: Boolean = false,
) {
    val containerColor =
        if (destructive) {
            MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.35f)
        } else {
            MaterialTheme.colorScheme.secondaryContainer
        }
    val contentColor =
        if (destructive) {
            MaterialTheme.colorScheme.error
        } else {
            MaterialTheme.colorScheme.onSecondaryContainer
        }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        FilledTonalIconButton(
            onClick = onClick,
            shapes = IconButtonDefaults.shapes(),
            colors =
                IconButtonDefaults.filledTonalIconButtonColors(
                    containerColor = containerColor,
                    contentColor = contentColor,
                ),
            modifier = Modifier.size(68.dp),
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(24.dp),
            )
        }

        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            color = if (destructive) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
            maxLines = 1,
        )
    }
}

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
private fun ChildTransactionRow(
    child: TransactionListItem,
    onClick: () -> Unit,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
) {
    with(sharedTransitionScope) {
        ListItem(
            modifier =
                Modifier
                    .sharedBounds(
                        sharedContentState = rememberSharedContentState(key = "tx_${child.id}"),
                        animatedVisibilityScope = animatedVisibilityScope,
                    ).clickable(onClick = onClick),
            colors =
                ListItemDefaults.colors(
                    containerColor = MaterialTheme.colorScheme.surfaceBright,
                ),
            leadingContent = {
                TransactionGlyph(
                    transaction = child,
                    modifier = Modifier.size(24.dp),
                )
            },
            headlineContent = {
                Text(
                    text = child.description,
                    style = MaterialTheme.typography.bodyLarge,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            },
            supportingContent = {
                val subtitle = child.categoryName.ifEmpty { child.typeLabel }
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            },
            trailingContent = {
                TransactionAmount(transaction = child)
            },
        )
    }
}

@Composable
private fun DetailRow(
    label: String,
    value: String,
) {
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Suppress("NewApi")
private val detailDateFormatter =
    DateTimeFormatter.ofPattern("EEEE, MMM d, yyyy 'at' h:mm a", Locale.US)

@Suppress("NewApi")
private fun formatDetailDate(unixTimestamp: Long): String =
    Instant
        .ofEpochSecond(unixTimestamp)
        .atZone(ZoneId.systemDefault())
        .format(detailDateFormatter)
