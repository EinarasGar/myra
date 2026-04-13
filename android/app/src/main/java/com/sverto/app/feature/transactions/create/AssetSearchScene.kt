package com.sverto.app.feature.transactions.create

import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.TrendingUp
import androidx.compose.material.icons.outlined.Cancel
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import uniffi.sverto_core.AssetItem

@OptIn(ExperimentalSharedTransitionApi::class, ExperimentalMaterial3Api::class)
@Composable
@Suppress("LongMethod")
fun SharedTransitionScope.AssetSearchScene(
    sharedKey: String,
    results: List<AssetItem>,
    onQueryChange: (String) -> Unit,
    onSelect: (AssetItem) -> Unit,
    onBack: () -> Unit,
    animatedVisibilityScope: AnimatedVisibilityScope,
    modifier: Modifier = Modifier,
) {
    var query by remember { mutableStateOf("") }
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) { focusRequester.requestFocus() }

    Column(
        modifier =
            modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.surface)
                .statusBarsPadding()
                .imePadding(),
    ) {
        Surface(
            shape = RoundedCornerShape(28.dp),
            color = MaterialTheme.colorScheme.surfaceContainerHigh,
            modifier =
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp)
                    .sharedBounds(
                        sharedContentState = rememberSharedContentState(key = sharedKey),
                        animatedVisibilityScope = animatedVisibilityScope,
                        boundsTransform = { _, _ ->
                            spring(dampingRatio = 0.8f, stiffness = 380f)
                        },
                    ),
        ) {
            Row(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .heightIn(min = 56.dp)
                        .padding(horizontal = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onBack) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = MaterialTheme.colorScheme.onSurface,
                    )
                }
                BasicTextField(
                    value = query,
                    onValueChange = {
                        query = it
                        onQueryChange(it)
                    },
                    singleLine = true,
                    textStyle =
                        LocalTextStyle.current.merge(
                            TextStyle(
                                color = MaterialTheme.colorScheme.onSurface,
                                fontSize = MaterialTheme.typography.bodyLarge.fontSize,
                            ),
                        ),
                    cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                    modifier =
                        Modifier
                            .weight(1f)
                            .focusRequester(focusRequester),
                    decorationBox = { innerTextField ->
                        Box(contentAlignment = Alignment.CenterStart) {
                            if (query.isEmpty()) {
                                Text(
                                    text = "Search assets…",
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            innerTextField()
                        }
                    },
                )
                if (query.isNotEmpty()) {
                    IconButton(onClick = {
                        query = ""
                        onQueryChange("")
                    }) {
                        Icon(
                            imageVector = Icons.Outlined.Cancel,
                            contentDescription = "Clear",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }

        when {
            query.isBlank() ->
                EmptySearchMessage(
                    icon = Icons.AutoMirrored.Outlined.TrendingUp,
                    iconTint = MaterialTheme.colorScheme.tertiary,
                    title = "Find an asset",
                    subtitle = "Search for a stock, ETF, currency, or fund",
                )
            results.isEmpty() ->
                EmptySearchMessage(
                    icon = Icons.Outlined.Search,
                    iconTint = MaterialTheme.colorScheme.onSurfaceVariant,
                    title = "No matches",
                    subtitle = "Nothing found for \"$query\"",
                )
            else ->
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding =
                        PaddingValues(
                            start = 12.dp,
                            end = 12.dp,
                            bottom = 32.dp,
                        ),
                ) {
                    items(items = results, key = { it.id }) { asset ->
                        AssetResultRow(
                            asset = asset,
                            onClick = { onSelect(asset) },
                        )
                    }
                }
        }
    }
}

@Composable
private fun AssetResultRow(
    asset: AssetItem,
    onClick: () -> Unit,
) {
    val tint = MaterialTheme.colorScheme.tertiary
    ListItem(
        modifier = Modifier.clickable(onClick = onClick),
        colors = ListItemDefaults.colors(containerColor = MaterialTheme.colorScheme.surface),
        leadingContent = {
            Box(
                modifier =
                    Modifier
                        .size(44.dp)
                        .background(
                            color = tint.copy(alpha = 0.14f),
                            shape = RoundedCornerShape(14.dp),
                        ),
                contentAlignment = Alignment.Center,
            ) {
                val initials = asset.ticker.take(3).ifBlank { "—" }
                Text(
                    text = initials,
                    style = MaterialTheme.typography.labelLarge,
                    color = tint,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        },
        headlineContent = {
            Text(
                text = asset.ticker.ifBlank { asset.name },
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        },
        supportingContent = {
            Text(
                text = asset.name,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        },
    )
}

@Composable
internal fun EmptySearchMessage(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconTint: androidx.compose.ui.graphics.Color,
    title: String,
    subtitle: String,
) {
    Column(
        modifier =
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 32.dp, vertical = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = iconTint,
            modifier = Modifier.size(48.dp),
        )
        Spacer(Modifier.height(12.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text = subtitle,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
