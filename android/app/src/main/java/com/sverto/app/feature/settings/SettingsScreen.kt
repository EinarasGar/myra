package com.sverto.app.feature.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeFlexibleTopAppBar
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.clerk.api.Clerk
import com.sverto.app.BuildConfig
import com.sverto.app.SvertoApp
import com.sverto.app.core.icons.LucideIcon
import com.sverto.app.core.theme.LocalClerkTheme
import com.sverto.app.feature.assets.components.CurrencyPickerSheet
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    onCustomAssets: () -> Unit,
    onCustomCategories: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val isClerk = BuildConfig.CLERK_PUBLISHABLE_KEY.isNotBlank()
    val user = if (isClerk) Clerk.user else null
    val displayName =
        listOfNotNull(user?.firstName, user?.lastName)
            .joinToString(" ")
            .ifBlank { if (isClerk) "Your account" else "Local account" }
    val email = user?.primaryEmailAddress?.emailAddress
    val context = LocalContext.current
    val appStore = remember { (context.applicationContext as SvertoApp).appStore }
    val scope = rememberCoroutineScope()
    var showCurrencyPicker by remember { mutableStateOf(false) }
    var baseCurrencyId by remember { mutableStateOf(appStore.getCachedMe()?.defaultAssetId) }
    var baseCurrencyTicker by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(baseCurrencyId) {
        val id = baseCurrencyId ?: return@LaunchedEffect
        val match =
            runCatching { withContext(Dispatchers.IO) { appStore.getAllCurrencies() } }
                .getOrNull()
                ?.firstOrNull { it.id == id }
        if (match != null) baseCurrencyTicker = match.ticker
    }

    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()

    Scaffold(
        modifier =
            modifier
                .fillMaxSize()
                .nestedScroll(scrollBehavior.nestedScrollConnection),
        containerColor = MaterialTheme.colorScheme.surfaceContainer,
        topBar = {
            LargeFlexibleTopAppBar(
                title = { Text("Settings") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors =
                    TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainer,
                        scrolledContainerColor = MaterialTheme.colorScheme.surfaceContainer,
                    ),
                scrollBehavior = scrollBehavior,
            )
        },
    ) { innerPadding ->
        Box(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
        ) {
            Column(
                modifier =
                    Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState()),
            ) {
                AccountHeader(displayName = displayName, email = email)
                HorizontalDivider(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    color = MaterialTheme.colorScheme.outlineVariant,
                )
                SettingsRow(
                    icon = "tags",
                    label = "Custom Categories",
                    onClick = onCustomCategories,
                )
                SettingsRow(
                    icon = "coins",
                    label = "Custom Assets",
                    onClick = onCustomAssets,
                )
                SettingsRow(
                    icon = "payments",
                    label = "Base Currency",
                    supporting = baseCurrencyTicker,
                    onClick = { showCurrencyPicker = true },
                )
                if (isClerk) {
                    ProfileSettingsRow()
                }
            }
            if (showCurrencyPicker) {
                CurrencyPickerSheet(
                    title = "Choose base currency",
                    selectedId = baseCurrencyId,
                    onSelect = { asset ->
                        showCurrencyPicker = false
                        baseCurrencyId = asset.id
                        baseCurrencyTicker = asset.ticker
                        scope.launch {
                            appStore.updateBaseAsset(asset.id)
                        }
                    },
                    onDismiss = { showCurrencyPicker = false },
                )
            }
        }
    }
}

@Composable
private fun AccountHeader(
    displayName: String,
    email: String?,
) {
    ListItem(
        colors = ListItemDefaults.colors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
        leadingContent = {
            Surface(
                shape = CircleShape,
                color = MaterialTheme.colorScheme.primaryContainer,
                modifier = Modifier.size(48.dp),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    LucideIcon(
                        name = "user",
                        tint = MaterialTheme.colorScheme.onPrimaryContainer,
                        modifier = Modifier.size(24.dp),
                    )
                }
            }
        },
        headlineContent = {
            Text(
                text = displayName,
                style = MaterialTheme.typography.titleMedium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        },
        supportingContent =
            email?.let {
                {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            },
    )
}

@Composable
private fun SettingsRow(
    icon: String,
    label: String,
    onClick: () -> Unit,
    supporting: String? = null,
) {
    ListItem(
        modifier = Modifier.clickable(onClick = onClick),
        colors = ListItemDefaults.colors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
        leadingContent = {
            LucideIcon(
                name = icon,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(24.dp),
            )
        },
        headlineContent = { Text(label, style = MaterialTheme.typography.bodyLarge) },
        supportingContent =
            supporting?.let {
                {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            },
        trailingContent = {
            Icon(
                imageVector = Icons.AutoMirrored.Outlined.KeyboardArrowRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        },
    )
}

@Composable
private fun ProfileSettingsRow() {
    ListItem(
        colors = ListItemDefaults.colors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
        leadingContent = {
            LucideIcon(
                name = "user-cog",
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(24.dp),
            )
        },
        headlineContent = { Text("Profile & account", style = MaterialTheme.typography.bodyLarge) },
        supportingContent = {
            Text(
                "Manage your profile and sign out",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        },
        trailingContent = {
            com.clerk.ui.userbutton.UserButton(
                clerkTheme = LocalClerkTheme.current,
            )
        },
    )
}
