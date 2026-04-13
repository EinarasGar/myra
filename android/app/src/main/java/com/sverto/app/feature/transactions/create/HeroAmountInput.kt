package com.sverto.app.feature.transactions.create

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

@Composable
fun HeroAmountInput(
    value: String,
    onValueChange: (String) -> Unit,
    sign: AmountSign,
    modifier: Modifier = Modifier,
    label: String = "Amount",
) {
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) { focusRequester.requestFocus() }

    val prefix =
        when (sign) {
            AmountSign.POSITIVE -> "+"
            AmountSign.NEGATIVE -> "−"
            AmountSign.ANY -> ""
        }
    val prefixColor =
        when (sign) {
            AmountSign.POSITIVE -> MaterialTheme.colorScheme.primary
            AmountSign.NEGATIVE -> MaterialTheme.colorScheme.error
            AmountSign.ANY -> MaterialTheme.colorScheme.onSurface
        }

    val numberStyle =
        MaterialTheme.typography.displayMedium.copy(
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurface,
        )

    Surface(
        shape = RoundedCornerShape(28.dp),
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
        modifier =
            modifier
                .fillMaxWidth()
                .semantics { contentDescription = "Amount input" },
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(4.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center,
            ) {
                if (prefix.isNotEmpty()) {
                    Text(
                        text = prefix,
                        style = numberStyle.copy(color = prefixColor),
                    )
                    Spacer(Modifier.width(4.dp))
                }
                Box(contentAlignment = Alignment.Center) {
                    if (value.isEmpty()) {
                        Text(
                            text = "0",
                            style =
                                numberStyle.copy(
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                ),
                        )
                    }
                    BasicTextField(
                        value = value,
                        onValueChange = { new ->
                            onValueChange(filterAmountInput(new, sign == AmountSign.ANY))
                        },
                        singleLine = true,
                        textStyle = LocalTextStyle.current.merge(numberStyle),
                        cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                        keyboardOptions =
                            KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.focusRequester(focusRequester),
                    )
                }
            }
        }
    }
}
