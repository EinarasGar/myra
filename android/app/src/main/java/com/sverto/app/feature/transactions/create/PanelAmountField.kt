package com.sverto.app.feature.transactions.create

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp

@Composable
fun PanelAmountField(
    value: String,
    onValueChange: (String) -> Unit,
    sign: AmountSign,
    label: String,
    modifier: Modifier = Modifier,
) {
    val prefix =
        when (sign) {
            AmountSign.POSITIVE -> "+"
            AmountSign.NEGATIVE -> "−"
            AmountSign.ANY -> ""
        }
    val signColor =
        when (sign) {
            AmountSign.POSITIVE -> MaterialTheme.colorScheme.primary
            AmountSign.NEGATIVE -> MaterialTheme.colorScheme.error
            AmountSign.ANY -> MaterialTheme.colorScheme.onSurfaceVariant
        }

    Surface(
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surface,
        modifier = modifier.fillMaxWidth().heightIn(min = 64.dp),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier =
                    Modifier
                        .size(40.dp)
                        .background(
                            color = signColor.copy(alpha = 0.16f),
                            shape = RoundedCornerShape(14.dp),
                        ),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = prefix.ifEmpty { "#" },
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = signColor,
                )
            }
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(2.dp))
                AmountTextField(
                    value = value,
                    onValueChange = onValueChange,
                )
            }
        }
    }
}

@Composable
private fun AmountTextField(
    value: String,
    onValueChange: (String) -> Unit,
) {
    val textStyle =
        MaterialTheme.typography.titleLarge.copy(
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface,
        )

    Box(contentAlignment = Alignment.CenterStart) {
        if (value.isEmpty()) {
            Text(
                text = "0",
                style = textStyle.copy(color = MaterialTheme.colorScheme.onSurfaceVariant),
            )
        }
        BasicTextField(
            value = value,
            onValueChange = { new -> onValueChange(filterAmountInput(new, allowNegative = false)) },
            singleLine = true,
            textStyle = LocalTextStyle.current.merge(textStyle),
            cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
        )
    }
}
