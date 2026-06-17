package com.sverto.app.feature.assets.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Cancel
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LoadingIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import com.sverto.app.SvertoApp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import uniffi.sverto_core.AssetItem

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun CurrencyPickerSheet(
    title: String,
    onSelect: (AssetItem) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    selectedId: Int? = null,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val context = LocalContext.current
    val appStore = remember { (context.applicationContext as SvertoApp).appStore }
    var query by remember { mutableStateOf("") }
    var allCurrencies by remember { mutableStateOf<List<AssetItem>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        allCurrencies =
            try {
                orderCurrencies(withContext(Dispatchers.IO) { appStore.getAllCurrencies() })
            } catch (
                @Suppress("TooGenericExceptionCaught") _: Exception,
            ) {
                emptyList()
            }
        loading = false
    }

    val results =
        remember(query, allCurrencies) {
            if (query.isBlank()) {
                allCurrencies
            } else {
                allCurrencies.filter {
                    it.ticker.contains(query, ignoreCase = true) ||
                        it.name.contains(query, ignoreCase = true)
                }
            }
        }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        containerColor = MaterialTheme.colorScheme.surfaceContainer,
    ) {
        Column(
            modifier
                .fillMaxWidth()
                .fillMaxHeight(0.9f)
                .padding(horizontal = 12.dp),
        ) {
            Text(
                title,
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.padding(start = 8.dp, top = 4.dp, bottom = 12.dp),
            )
            Surface(
                shape = MaterialTheme.shapes.extraLarge,
                color = MaterialTheme.colorScheme.surfaceBright,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .heightIn(min = 56.dp)
                            .padding(horizontal = 16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Outlined.Search,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.size(12.dp))
                    BasicTextField(
                        value = query,
                        onValueChange = { query = it },
                        singleLine = true,
                        textStyle =
                            TextStyle(
                                color = MaterialTheme.colorScheme.onSurface,
                                fontSize = MaterialTheme.typography.bodyLarge.fontSize,
                            ),
                        cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                        modifier = Modifier.weight(1f),
                        decorationBox = { inner ->
                            if (query.isEmpty()) {
                                Text(
                                    "Search currencies…",
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            inner()
                        },
                    )
                    if (query.isNotEmpty()) {
                        IconButton(onClick = { query = "" }) {
                            Icon(Icons.Outlined.Cancel, contentDescription = "Clear")
                        }
                    }
                }
            }
            Spacer(Modifier.size(8.dp))
            when {
                loading && results.isEmpty() ->
                    Box(
                        Modifier.fillMaxWidth().padding(32.dp),
                        contentAlignment = Alignment.Center,
                    ) { LoadingIndicator() }
                results.isEmpty() ->
                    PickerMessageBox(
                        if (query.isBlank()) "No currencies available" else "No matches for \"$query\"",
                    )
                else ->
                    LazyColumn(Modifier.fillMaxWidth()) {
                        items(results, key = { it.id }) { asset ->
                            AssetListRow(
                                ticker = asset.ticker,
                                name = asset.name,
                                supportingText = asset.name,
                                selected = asset.id == selectedId,
                                onClick = { onSelect(asset) },
                            )
                        }
                    }
            }
        }
    }
}

@Composable
private fun PickerMessageBox(
    text: String,
    modifier: Modifier = Modifier,
) {
    Box(modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
        Text(text, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
