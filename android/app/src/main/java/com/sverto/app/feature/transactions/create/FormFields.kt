package com.sverto.app.feature.transactions.create

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ShowChart
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

private val dateFormatter = DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.US)
private val shortDateFormatter = DateTimeFormatter.ofPattern("MMM d", Locale.US)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DateChip(
    dateEpochSeconds: Long?,
    onSelectDate: (Long) -> Unit,
    modifier: Modifier = Modifier,
) {
    var showDialog by remember { mutableStateOf(false) }
    val displayText =
        dateEpochSeconds?.let { formatRelativeDate(it) } ?: "Select date"

    Surface(
        shape = RoundedCornerShape(percent = 50),
        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.55f),
        modifier = modifier.clickable { showDialog = true },
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = Icons.Outlined.CalendarMonth,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onPrimaryContainer,
                modifier = Modifier.size(18.dp),
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text = displayText,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
            )
        }
    }

    if (showDialog) {
        val state =
            rememberDatePickerState(
                initialSelectedDateMillis =
                    (dateEpochSeconds ?: (System.currentTimeMillis() / 1000)) * 1000,
            )
        DatePickerDialog(
            onDismissRequest = { showDialog = false },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { onSelectDate(it) }
                    showDialog = false
                }) { Text("OK") }
            },
            dismissButton = {
                TextButton(onClick = { showDialog = false }) { Text("Cancel") }
            },
        ) {
            DatePicker(state = state)
        }
    }
}

private fun formatRelativeDate(epochSeconds: Long): String {
    val date =
        Instant
            .ofEpochSecond(epochSeconds)
            .atZone(ZoneId.systemDefault())
            .toLocalDate()
    val today = java.time.LocalDate.now(ZoneId.systemDefault())
    return when (date) {
        today -> "Today, ${date.format(shortDateFormatter)}"
        today.minusDays(1) -> "Yesterday, ${date.format(shortDateFormatter)}"
        else -> date.format(dateFormatter)
    }
}

@Composable
fun AccountPickerField(
    selectedName: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    label: String = "Account",
    tint: Color = MaterialTheme.colorScheme.primary,
) {
    PickerField(
        label = label,
        value = selectedName.ifEmpty { null },
        leadingIcon = Icons.Outlined.AccountBalanceWallet,
        iconTint = tint,
        placeholder = "Choose account",
        onClick = onClick,
        modifier = modifier,
    )
}

@Composable
fun AssetPickerField(
    selectedDisplay: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    label: String = "Asset",
    tint: Color = MaterialTheme.colorScheme.tertiary,
) {
    PickerField(
        label = label,
        value = selectedDisplay.ifEmpty { null },
        leadingIcon = Icons.AutoMirrored.Outlined.ShowChart,
        iconTint = tint,
        placeholder = "Search assets",
        onClick = onClick,
        modifier = modifier,
    )
}
