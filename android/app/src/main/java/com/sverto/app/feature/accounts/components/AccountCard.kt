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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
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

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
fun AccountCard(
    account: AccountListItem,
    onClick: () -> Unit,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
    modifier: Modifier = Modifier,
) {
    with(sharedTransitionScope) {
        Card(
            onClick = onClick,
            shape = RoundedCornerShape(28.dp),
            colors =
                CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
                ),
            modifier =
                modifier
                    .fillMaxWidth()
                    .sharedBounds(
                        sharedContentState = rememberSharedContentState(key = "account_${account.id}"),
                        animatedVisibilityScope = animatedVisibilityScope,
                    ),
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier =
                        Modifier
                            .size(52.dp)
                            .background(
                                color = accountTypeContainerColor(account.accountTypeId),
                                shape = CircleShape,
                            ),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = accountTypeIcon(account.accountTypeId),
                        contentDescription = null,
                        tint = accountTypeOnContainerColor(account.accountTypeId),
                        modifier = Modifier.size(26.dp),
                    )
                }

                Spacer(modifier = Modifier.width(16.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = account.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = accountTypeLabel(account.accountTypeId),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(horizontalAlignment = Alignment.End) {
                    val balance = account.balance
                    if (balance != null) {
                        Text(
                            text = formatCurrency(balance),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                        val gain = account.unrealizedGain
                        if (account.accountTypeId == 3 && gain != null) {
                            Spacer(modifier = Modifier.height(2.dp))
                            val gainColor =
                                if (gain >= 0) {
                                    MaterialTheme.colorScheme.primary
                                } else {
                                    MaterialTheme.colorScheme.error
                                }
                            val sign = if (gain >= 0) "+" else "-"
                            val pct =
                                if (balance > 0) {
                                    (gain / balance) * 100.0
                                } else {
                                    0.0
                                }
                            Text(
                                text = "$sign${formatCurrency(abs(gain))} (${formatPercent(pct)}%)",
                                style = MaterialTheme.typography.labelMedium,
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
