package com.sverto.app.feature.accounts.components

import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.foundation.background
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
import androidx.compose.material.icons.automirrored.outlined.ShowChart
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.Savings
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import uniffi.sverto_core.AccountListItem
import kotlin.math.abs

internal fun formatCurrency(value: Double): String {
    val absValue = abs(value)
    val whole = absValue.toLong()
    val fraction = ((absValue - whole) * 100).toLong()
    val formatted =
        buildString {
            val wholeStr = whole.toString()
            wholeStr.forEachIndexed { index, c ->
                if (index > 0 && (wholeStr.length - index) % 3 == 0) append(',')
                append(c)
            }
            append('.')
            append(fraction.toString().padStart(2, '0'))
        }
    val prefix = if (value < 0) "-£" else "£"
    return "$prefix$formatted"
}

internal fun formatPercent(value: Double): String = "%.1f".format(abs(value))

private fun accountTypeLabel(accountTypeId: Int): String =
    when (accountTypeId) {
        1 -> "Current"
        2 -> "Savings"
        3 -> "Investment"
        else -> "Account"
    }

@Composable
fun accountTypeColor(accountTypeId: Int): Color =
    when (accountTypeId) {
        1 -> MaterialTheme.colorScheme.primary
        3 -> MaterialTheme.colorScheme.tertiary
        2 -> MaterialTheme.colorScheme.secondary
        else -> MaterialTheme.colorScheme.primary
    }

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
fun AccountCard(
    account: AccountListItem,
    onClick: () -> Unit,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
    modifier: Modifier = Modifier,
) {
    val tintColor = accountTypeColor(account.accountTypeId)
    val icon =
        when (account.accountTypeId) {
            1 -> Icons.Outlined.AccountBalance
            3 -> Icons.AutoMirrored.Outlined.ShowChart
            2 -> Icons.Outlined.Savings
            else -> Icons.Outlined.AccountBalance
        }

    with(sharedTransitionScope) {
        ElevatedCard(
            onClick = onClick,
            modifier =
                modifier
                    .fillMaxWidth()
                    .sharedBounds(
                        sharedContentState = rememberSharedContentState(key = "account_${account.id}"),
                        animatedVisibilityScope = animatedVisibilityScope,
                    ),
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier =
                        Modifier
                            .size(40.dp)
                            .background(
                                color = tintColor.copy(alpha = 0.12f),
                                shape = RoundedCornerShape(12.dp),
                            ),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = account.name,
                        tint = tintColor,
                        modifier = Modifier.size(20.dp),
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = account.name,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = accountTypeLabel(account.accountTypeId),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                Column(horizontalAlignment = Alignment.End) {
                    val balance = account.balance
                    if (balance != null) {
                        Text(
                            text = formatCurrency(balance),
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        val gain = account.unrealizedGain
                        if (account.accountTypeId == 3 && gain != null) {
                            val gainColor = if (gain >= 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                            val sign = if (gain >= 0) "+" else "-"
                            val pct =
                                if (balance > 0) {
                                    (gain / balance) * 100.0
                                } else {
                                    0.0
                                }
                            Text(
                                text = "$sign${formatCurrency(abs(gain))} (${formatPercent(pct)}%)",
                                style = MaterialTheme.typography.labelSmall,
                                color = gainColor,
                            )
                        }
                    } else {
                        // Skeleton loading for balance
                        Box(
                            modifier =
                                Modifier
                                    .width(80.dp)
                                    .height(20.dp)
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(MaterialTheme.colorScheme.surfaceVariant),
                        )
                    }
                }
            }
        }
    }
}
