package com.sverto.app.feature.transactions.components

import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.sverto.app.core.ui.RowDivider
import com.sverto.app.feature.transactions.TransactionAmount
import com.sverto.app.feature.transactions.TransactionGlyph
import uniffi.sverto_core.TransactionListItem
import uniffi.sverto_core.TransactionVisibility
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

@Suppress("NewApi")
private val dateFormatter = DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.US)

@Suppress("NewApi")
internal fun groupByDate(
    transactions: List<TransactionListItem>,
    today: LocalDate = LocalDate.now(),
): List<Pair<String, List<TransactionListItem>>> {
    val yesterday = today.minusDays(1)

    return transactions
        .groupBy { tx ->
            val date =
                Instant
                    .ofEpochSecond(tx.date)
                    .atZone(ZoneId.systemDefault())
                    .toLocalDate()
            when (date) {
                today -> "Today"
                yesterday -> "Yesterday"
                else -> date.format(dateFormatter)
            }
        }.toList()
}

@OptIn(ExperimentalFoundationApi::class, ExperimentalSharedTransitionApi::class)
internal fun LazyListScope.transactionDayItems(
    groupedTransactions: List<Pair<String, List<TransactionListItem>>>,
    selectedIds: Set<String>,
    selectionActive: Boolean,
    onTransactionClick: (TransactionListItem) -> Unit,
    onToggleSelect: ((String) -> Unit)?,
    sharedTransitionScope: SharedTransitionScope?,
    animatedVisibilityScope: AnimatedVisibilityScope?,
) {
    groupedTransactions.forEach { (dateLabel, groupItems) ->
        // NOTE: no Modifier.animateItem() here. This list is date-grouped and updates
        // via bulk pull-to-refresh (the whole list is replaced), and animateItem() on a
        // stickyHeader makes the placement animation fire across the whole list on
        // refresh — the "list flies to the bottom and back" + frame-hitch glitch.
        stickyHeader(key = dateLabel) {
            DateHeader(dateLabel)
        }
        item(key = "card_$dateLabel") {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.surfaceBright,
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
            ) {
                Column {
                    groupItems.forEachIndexed { index, transaction ->
                        TransactionRow(
                            transaction = transaction,
                            selected = transaction.id in selectedIds,
                            onClick = {
                                if (selectionActive && onToggleSelect != null) {
                                    onToggleSelect(transaction.id)
                                } else {
                                    onTransactionClick(transaction)
                                }
                            },
                            onLongClick = onToggleSelect?.let { toggle -> { toggle(transaction.id) } },
                            sharedTransitionScope = sharedTransitionScope,
                            animatedVisibilityScope = animatedVisibilityScope,
                        )
                        if (index < groupItems.lastIndex) {
                            RowDivider()
                        }
                    }
                }
            }
        }
    }
}

@Composable
internal fun DateHeader(
    label: String,
    modifier: Modifier = Modifier,
) {
    Text(
        text = label,
        style = MaterialTheme.typography.labelMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier =
            modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surfaceContainer)
                .padding(
                    start = 16.dp,
                    end = 16.dp,
                    top = 16.dp,
                    bottom = 8.dp,
                ),
    )
}

@OptIn(ExperimentalSharedTransitionApi::class, ExperimentalFoundationApi::class)
@Composable
internal fun TransactionRow(
    transaction: TransactionListItem,
    selected: Boolean,
    onClick: () -> Unit,
    onLongClick: (() -> Unit)?,
    sharedTransitionScope: SharedTransitionScope?,
    animatedVisibilityScope: AnimatedVisibilityScope?,
) {
    val haptics = LocalHapticFeedback.current
    val containerColor by
        animateColorAsState(
            targetValue =
                if (selected) {
                    MaterialTheme.colorScheme.secondaryContainer
                } else {
                    MaterialTheme.colorScheme.surfaceBright
                },
            label = "rowContainerColor",
        )

    // Search renders above the still-composed transactions list, so both would register the
    // same sharedBounds key for one id. Search passes null scopes to opt out.
    val sharedModifier =
        if (sharedTransitionScope != null && animatedVisibilityScope != null) {
            with(sharedTransitionScope) {
                Modifier.sharedBounds(
                    sharedContentState = rememberSharedContentState(key = "tx_${transaction.id}"),
                    animatedVisibilityScope = animatedVisibilityScope,
                )
            }
        } else {
            Modifier
        }

    ListItem(
        modifier =
            sharedModifier
                .combinedClickable(
                    onClick = onClick,
                    onLongClick =
                        onLongClick?.let { callback ->
                            {
                                haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                                callback()
                            }
                        },
                ).alpha(
                    if (transaction.visibility == TransactionVisibility.GHOST && !selected) 0.55f else 1f,
                ),
        colors =
            ListItemDefaults.colors(
                containerColor = containerColor,
            ),
        leadingContent = {
            if (selected) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier =
                        Modifier
                            .size(24.dp)
                            .background(MaterialTheme.colorScheme.primary, CircleShape),
                ) {
                    Icon(
                        imageVector = Icons.Filled.Check,
                        contentDescription = "Selected",
                        tint = MaterialTheme.colorScheme.onPrimary,
                        modifier = Modifier.size(16.dp),
                    )
                }
            } else {
                TransactionGlyph(
                    transaction = transaction,
                    modifier = Modifier.size(24.dp),
                )
            }
        },
        headlineContent = {
            Text(
                text = transaction.description,
                style = MaterialTheme.typography.bodyLarge,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        },
        supportingContent = {
            val subtitle =
                transaction.categoryName.ifEmpty {
                    transaction.typeLabel
                }
            if (subtitle.isNotEmpty()) {
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        },
        trailingContent = {
            TransactionAmount(transaction = transaction)
        },
    )
}
