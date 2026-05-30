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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sverto.app.feature.accounts.AccountType
import com.sverto.app.feature.accounts.MockAccount
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

@Composable
fun accountTypeColor(type: AccountType): Color =
    when (type) {
        AccountType.CURRENT -> MaterialTheme.colorScheme.primary
        AccountType.BROKERAGE -> MaterialTheme.colorScheme.tertiary
        AccountType.SAVINGS -> MaterialTheme.colorScheme.secondary
    }

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
fun AccountCard(
    account: MockAccount,
    onClick: () -> Unit,
    sharedTransitionScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
    modifier: Modifier = Modifier,
) {
    val tintColor = accountTypeColor(account.type)
    val icon =
        when (account.type) {
            AccountType.CURRENT -> Icons.Outlined.AccountBalance
            AccountType.BROKERAGE -> Icons.AutoMirrored.Outlined.ShowChart
            AccountType.SAVINGS -> Icons.Outlined.Savings
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
                        text = account.type.label,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = formatCurrency(account.balance),
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    when (account.type) {
                        AccountType.BROKERAGE -> {
                            val gain = account.gainAmount ?: 0.0
                            val pct = account.gainPercent ?: 0.0
                            val gainColor = if (gain >= 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                            val sign = if (gain >= 0) "+" else "-"
                            Text(
                                text = "$sign${formatCurrency(abs(gain))} (${formatPercent(pct)}%)",
                                style = MaterialTheme.typography.labelSmall,
                                color = gainColor,
                            )
                        }
                        AccountType.CURRENT -> {}
                        AccountType.SAVINGS -> {}
                    }
                }
            }
        }
    }
}
