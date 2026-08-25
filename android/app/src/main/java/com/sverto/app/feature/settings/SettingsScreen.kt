package com.sverto.app.feature.settings

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Environment
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.FileDownload
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeFlexibleTopAppBar
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.LoadingIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberModalBottomSheetState
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
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.clerk.api.Clerk
import com.sverto.app.BuildConfig
import com.sverto.app.SvertoApp
import com.sverto.app.core.SvertoViewModelFactory
import com.sverto.app.core.icons.LucideIcon
import com.sverto.app.core.theme.LocalClerkTheme
import com.sverto.app.feature.assets.components.CurrencyPickerSheet
import com.sverto.app.feature.server.AppSessionViewModel
import com.sverto.app.feature.server.ServerOrigin
import com.sverto.app.feature.server.ServerSettingsSheet
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import uniffi.sverto_core.AiUsageWindow
import uniffi.sverto_core.AppStore
import uniffi.sverto_core.AssetItem
import uniffi.sverto_core.AuthMode
import uniffi.sverto_core.ExportFormat
import uniffi.sverto_core.LedgerExport
import uniffi.sverto_core.ServerInfo
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    onCustomAssets: () -> Unit,
    onCustomCategories: () -> Unit,
    onConnectors: () -> Unit,
    modifier: Modifier = Modifier,
    aiUsageViewModel: AiUsageViewModel = viewModel(factory = SvertoViewModelFactory),
    sessionViewModel: AppSessionViewModel? = null,
    exportsViewModel: ExportsViewModel = viewModel(factory = SvertoViewModelFactory),
) {
    val context = LocalContext.current
    val appStore = remember { (context.applicationContext as SvertoApp).appStore }
    val scope = rememberCoroutineScope()
    var showCurrencyPicker by remember { mutableStateOf(false) }
    var showDeleteConfirm by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf(false) }
    var showServerSettings by remember { mutableStateOf(false) }
    var baseCurrencyId by remember { mutableStateOf(appStore.getCachedMe()?.defaultAsset?.id) }
    var baseCurrencyTicker by remember { mutableStateOf<String?>(null) }
    val serverInfo by
        sessionViewModel?.let { it.serverInfo.collectAsStateWithLifecycle() }
            ?: remember { mutableStateOf<ServerInfo?>(null) }
    val activeServerUrl by
        sessionViewModel?.let { it.activeServerUrl.collectAsStateWithLifecycle() }
            ?: remember { mutableStateOf<String?>(null) }
    val serverOrigin by
        sessionViewModel?.let { it.serverOrigin.collectAsStateWithLifecycle() }
            ?: remember { mutableStateOf<ServerOrigin?>(null) }
    val serverUrl = activeServerUrl ?: BuildConfig.API_BASE_URL
    val serverVersion = serverInfo?.version ?: ""
    val authMode = serverInfo?.authMode ?: AuthMode.NOAUTH
    val aiUsageState by aiUsageViewModel.state.collectAsStateWithLifecycle()
    val exportsState by exportsViewModel.state.collectAsStateWithLifecycle()
    var showExportsSheet by remember { mutableStateOf(false) }

    val isClerk = authMode == AuthMode.CLERK
    val displayName =
        when (authMode) {
            AuthMode.CLERK -> {
                listOfNotNull(Clerk.user?.firstName, Clerk.user?.lastName)
                    .joinToString(" ")
                    .ifBlank { "Your account" }
            }
            AuthMode.DATABASE -> appStore.getCachedMe()?.userMetadata?.username ?: "Your account"
            AuthMode.NOAUTH -> "Local account"
        }
    val email = if (isClerk) Clerk.user?.primaryEmailAddress?.emailAddress else null

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
                SettingsRow(
                    icon = "cable",
                    label = "Connected Services",
                    onClick = onConnectors,
                )
                if (serverOrigin == ServerOrigin.SELF_HOSTED) {
                    SettingsRow(
                        icon = "server",
                        label = "Server",
                        supporting = serverUrl,
                        onClick = { showServerSettings = true },
                    )
                }
                SettingsRow(
                    icon = "download",
                    label = "Export ledger",
                    onClick = { showExportsSheet = true },
                )
                if (isClerk) {
                    ProfileSettingsRow()
                } else if (authMode == AuthMode.DATABASE) {
                    SettingsRow(
                        icon = "log-out",
                        label = "Sign out",
                        onClick = {
                            sessionViewModel?.signOut()
                            onBack()
                        },
                    )
                }
                AiUsageSection(state = aiUsageState)
                if (authMode != AuthMode.NOAUTH) {
                    DeleteAccountRow(
                        enabled = !deleting,
                        onClick = { showDeleteConfirm = true },
                    )
                }
            }
            SettingsOverlays(
                showCurrencyPicker = showCurrencyPicker,
                baseCurrencyId = baseCurrencyId,
                onCurrencySelected = { asset ->
                    showCurrencyPicker = false
                    baseCurrencyId = asset.id
                    baseCurrencyTicker = asset.ticker
                    scope.launch {
                        appStore.updateBaseAsset(asset.id, asset.ticker)
                    }
                },
                onDismissCurrencyPicker = { showCurrencyPicker = false },
                showExportsSheet = showExportsSheet,
                exportsState = exportsState,
                onCreateExport = exportsViewModel::createExport,
                onDownloadExport = exportsViewModel::fetchDownload,
                onConsumeDownload = exportsViewModel::consumeDownload,
                onDismissExports = { showExportsSheet = false },
                showDeleteConfirm = showDeleteConfirm,
                deleting = deleting,
                onConfirmDelete = {
                    deleteUserAndSignOut(
                        scope,
                        appStore,
                        sessionViewModel,
                        isClerk,
                        { deleting = true },
                        {
                            deleting = false
                            showDeleteConfirm = false
                            onBack()
                        },
                    )
                },
                onDismissDelete = { showDeleteConfirm = false },
                showServerSettings = showServerSettings && serverOrigin == ServerOrigin.SELF_HOSTED,
                serverUrl = serverUrl,
                serverVersion = serverVersion,
                authModeLabel = authMode.label(),
                onSwitchServer = {
                    showServerSettings = false
                    sessionViewModel?.useDifferentServer()
                    onBack()
                },
                onDismissServer = { showServerSettings = false },
            )
        }
    }
}

@Composable
private fun DeleteAccountRow(
    enabled: Boolean,
    onClick: () -> Unit,
) {
    HorizontalDivider(
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
        color = MaterialTheme.colorScheme.outlineVariant,
    )
    ListItem(
        modifier = Modifier.clickable(enabled = enabled, onClick = onClick),
        colors = ListItemDefaults.colors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
        leadingContent = {
            Icon(
                imageVector = Icons.Outlined.Delete,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.error,
                modifier = Modifier.size(24.dp),
            )
        },
        headlineContent = {
            Text(
                "Delete account",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.error,
            )
        },
    )
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
private fun AiUsageSection(state: AiUsageUiState) {
    Column(modifier = Modifier.fillMaxWidth()) {
        HorizontalDivider(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            color = MaterialTheme.colorScheme.outlineVariant,
        )
        Text(
            text = "AI Usage",
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
        )
        val usage = state.usage
        when {
            usage != null -> {
                AiUsageWindowGroup(title = "Hourly", window = usage.hourly)
                AiUsageWindowGroup(title = "Monthly", window = usage.monthly)
            }
            else -> {
                Text(
                    text = state.error ?: "Loading usage…",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                )
            }
        }
        Spacer(Modifier.height(16.dp))
    }
}

@Composable
private fun AiUsageWindowGroup(
    title: String,
    window: AiUsageWindow,
) {
    Column(
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(text = title, style = MaterialTheme.typography.titleSmall)
            Text(
                text = "Resets ${formatReset(window.resetAt)}",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        AiUsageBar(label = "Input", used = window.input.used, limit = window.input.limit)
        AiUsageBar(label = "Output", used = window.output.used, limit = window.output.limit)
    }
}

@Composable
private fun AiUsageBar(
    label: String,
    used: Long,
    limit: Long,
) {
    val percent = usagePercent(used, limit)
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(text = label, style = MaterialTheme.typography.labelLarge)
            Text(
                text = "$percent%",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        LinearProgressIndicator(
            progress = { percent / 100f },
            modifier = Modifier.fillMaxWidth(),
            color = MaterialTheme.colorScheme.primary,
            trackColor = MaterialTheme.colorScheme.surfaceContainerHighest,
        )
    }
}

private fun usagePercent(
    used: Long,
    limit: Long,
): Int =
    if (limit <= 0L) {
        0
    } else {
        ((used.toDouble() / limit.toDouble()) * 100).roundToInt().coerceIn(0, 100)
    }

private fun formatReset(epochSeconds: Long): String {
    val zoned = Instant.ofEpochSecond(epochSeconds).atZone(ZoneId.systemDefault())
    return zoned.format(DateTimeFormatter.ofLocalizedDateTime(FormatStyle.SHORT))
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

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun ExportsSheet(
    state: ExportsUiState,
    onCreate: (ExportFormat) -> Unit,
    onDownload: (LedgerExport) -> Unit,
    onConsumeDownload: () -> Unit,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val context = LocalContext.current

    LaunchedEffect(state.download) {
        state.download?.let { download ->
            enqueueDownload(context, download)
            onConsumeDownload()
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        containerColor = MaterialTheme.colorScheme.surfaceContainer,
    ) {
        Column(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.85f)
                    .padding(horizontal = 24.dp),
        ) {
            Text(
                text = "Export ledger",
                style = MaterialTheme.typography.headlineSmall,
            )
            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Button(
                    enabled = !state.creating,
                    onClick = { onCreate(ExportFormat.CSV) },
                    modifier = Modifier.weight(1f),
                ) {
                    Text("CSV")
                }
                Button(
                    enabled = !state.creating,
                    onClick = { onCreate(ExportFormat.BEANCOUNT) },
                    modifier = Modifier.weight(1f),
                ) {
                    Text("Beancount")
                }
            }
            if (state.creating) {
                Text(
                    text = "Creating export…",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 12.dp),
                )
            }
            state.error?.let { error ->
                Text(
                    text = error,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(top = 12.dp),
                )
            }
            Spacer(Modifier.height(16.dp))
            Text(
                text = "Previous exports",
                style = MaterialTheme.typography.titleMedium,
            )
            Spacer(Modifier.height(8.dp))
            when {
                state.loading && state.exports.isEmpty() ->
                    Box(
                        Modifier.fillMaxWidth().padding(32.dp),
                        contentAlignment = Alignment.Center,
                    ) { LoadingIndicator() }
                state.exports.isEmpty() ->
                    Box(
                        Modifier.fillMaxWidth().padding(32.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = "No exports yet",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                else ->
                    LazyColumn(Modifier.fillMaxWidth()) {
                        items(state.exports, key = { it.id }) { export ->
                            ExportRow(
                                export = export,
                                onDownload = { onDownload(export) },
                            )
                        }
                    }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun ExportRow(
    export: LedgerExport,
    onDownload: () -> Unit,
) {
    ListItem(
        modifier = Modifier.clickable(onClick = onDownload),
        colors = ListItemDefaults.colors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
        leadingContent = {
            Icon(
                imageVector = Icons.Outlined.FileDownload,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
            )
        },
        headlineContent = { Text(formatLabel(export.format), style = MaterialTheme.typography.bodyLarge) },
        supportingContent = {
            Text(
                text = formatExportDate(export.createdAt),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        },
    )
}

private fun formatLabel(format: ExportFormat): String =
    when (format) {
        ExportFormat.CSV -> "CSV"
        ExportFormat.BEANCOUNT -> "Beancount"
    }

private fun formatExportDate(createdAt: String): String =
    runCatching { Instant.parse(createdAt).atZone(ZoneId.systemDefault()) }
        .map { it.format(DateTimeFormatter.ofLocalizedDateTime(FormatStyle.SHORT)) }
        .getOrElse { createdAt }

private fun enqueueDownload(
    context: Context,
    download: ExportDownload,
) {
    val request =
        DownloadManager
            .Request(Uri.parse(download.url))
            .setTitle(download.fileName)
            .setDescription("Ledger export")
            .setNotificationVisibility(
                DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED,
            ).setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, download.fileName)
    val manager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
    manager.enqueue(request)
}

private fun deleteUserAndSignOut(
    scope: CoroutineScope,
    appStore: AppStore,
    sessionViewModel: AppSessionViewModel?,
    isClerk: Boolean,
    onStarted: () -> Unit,
    onFinished: () -> Unit,
) {
    scope.launch {
        onStarted()
        runCatching {
            withContext(Dispatchers.IO) { appStore.deleteUser() }
        }
        if (isClerk) {
            Clerk.auth.signOut()
        } else {
            sessionViewModel?.signOut()
        }
        onFinished()
    }
}

private fun AuthMode.label(): String =
    when (this) {
        AuthMode.CLERK -> "Clerk"
        AuthMode.DATABASE -> "Database"
        AuthMode.NOAUTH -> "No auth"
    }

@Composable
private fun DeleteAccountDialog(
    deleting: Boolean,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = { if (!deleting) onDismiss() },
        title = { Text("Delete account") },
        text = {
            Text(
                "This permanently erases your account and all of your data — " +
                    "accounts, transactions, custom assets and their history, your own " +
                    "categories, AI chats, connections and uploaded files. Shared assets, " +
                    "exchange rates and seeded categories are untouched. This cannot be undone.",
            )
        },
        confirmButton = {
            TextButton(
                enabled = !deleting,
                onClick = onConfirm,
            ) {
                Text(
                    if (deleting) "Deleting…" else "Delete account",
                    color = MaterialTheme.colorScheme.error,
                )
            }
        },
        dismissButton = {
            TextButton(enabled = !deleting, onClick = onDismiss) {
                Text("Keep account")
            }
        },
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SettingsOverlays(
    showCurrencyPicker: Boolean,
    baseCurrencyId: Int?,
    onCurrencySelected: (AssetItem) -> Unit,
    onDismissCurrencyPicker: () -> Unit,
    showExportsSheet: Boolean,
    exportsState: ExportsUiState,
    onCreateExport: (ExportFormat) -> Unit,
    onDownloadExport: (LedgerExport) -> Unit,
    onConsumeDownload: () -> Unit,
    onDismissExports: () -> Unit,
    showDeleteConfirm: Boolean,
    deleting: Boolean,
    onConfirmDelete: () -> Unit,
    onDismissDelete: () -> Unit,
    showServerSettings: Boolean,
    serverUrl: String,
    serverVersion: String,
    authModeLabel: String,
    onSwitchServer: () -> Unit,
    onDismissServer: () -> Unit,
) {
    if (showCurrencyPicker) {
        CurrencyPickerSheet(
            title = "Choose base currency",
            selectedId = baseCurrencyId,
            onSelect = onCurrencySelected,
            onDismiss = onDismissCurrencyPicker,
        )
    }
    if (showExportsSheet) {
        ExportsSheet(
            state = exportsState,
            onCreate = onCreateExport,
            onDownload = onDownloadExport,
            onConsumeDownload = onConsumeDownload,
            onDismiss = onDismissExports,
        )
    }
    if (showDeleteConfirm) {
        DeleteAccountDialog(
            deleting = deleting,
            onDismiss = onDismissDelete,
            onConfirm = onConfirmDelete,
        )
    }
    if (showServerSettings) {
        ServerSettingsSheet(
            serverUrl = serverUrl,
            serverVersion = serverVersion,
            authModeLabel = authModeLabel,
            onSwitchServer = onSwitchServer,
            onDismiss = onDismissServer,
        )
    }
}
