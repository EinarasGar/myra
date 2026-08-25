package com.sverto.app.feature.connectors

import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeFlexibleTopAppBar
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sverto.app.core.SvertoViewModelFactory
import uniffi.sverto_core.BindingStatus
import uniffi.sverto_core.BindingWriteMode
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Suppress("LongMethod", "CyclomaticComplexMethod")
@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ConnectionDetailScreen(
    connectionId: String,
    onBack: () -> Unit,
    onAddBinding: () -> Unit,
    onRevoked: () -> Unit,
    onOpenAccount: (providerAccountId: String, displayName: String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ConnectionDetailViewModel = viewModel(factory = SvertoViewModelFactory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var expandedBindingId by remember { mutableStateOf<String?>(null) }
    var deleteBindingId by remember { mutableStateOf<String?>(null) }
    var showRevokeConfirm by remember { mutableStateOf(false) }
    val dateFormatter = remember { SimpleDateFormat("d MMM yyyy", Locale.getDefault()) }
    val connectorInfo = CONNECTORS.firstOrNull { it.kind == state.connection?.providerKind }

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer =
            LifecycleEventObserver { _, event ->
                if (event == Lifecycle.Event.ON_RESUME) viewModel.load(connectionId)
            }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
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
                title = { Text(connectorInfo?.name ?: "Connection") },
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
            val scrollState = rememberScrollState()
            val hasBindings = state.bindings.isNotEmpty()
            if (state.connection == null && state.loading) {
                Column(
                    modifier =
                        Modifier
                            .fillMaxSize()
                            .padding(horizontal = 16.dp),
                ) {
                    Spacer(Modifier.height(8.dp))
                    ConnectionDetailSkeleton()
                }
                return@Box
            }
            Column(
                modifier =
                    Modifier
                        .fillMaxSize()
                        .then(if (hasBindings) Modifier.verticalScroll(scrollState) else Modifier)
                        .padding(horizontal = 16.dp),
            ) {
                Spacer(Modifier.height(8.dp))
                state.connection?.let { connection ->
                    val supporting =
                        if (
                            connection.providerKind == "truelayer" ||
                                connection.providerKind == "enablebanking"
                        ) {
                            connection.consentExpiresAt?.let {
                                "Consent until ${dateFormatter.format(Date(it * 1000))}"
                            }
                        } else {
                            connection.providerKeyId?.let { "Key · ${it.takeLast(4)}" }
                        }
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(24.dp),
                        color = MaterialTheme.colorScheme.surfaceBright,
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                        ) {
                            ProviderAvatar(icon = connectorInfo?.icon ?: "plug", size = 48.dp)
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    connectorInfo?.name
                                        ?: connection.providerKind.replaceFirstChar { it.uppercase() },
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                if (supporting != null) {
                                    Text(
                                        supporting,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                            StatusChip(connection.status)
                        }
                    }
                }
                Spacer(Modifier.height(24.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        "Linked accounts",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.weight(1f),
                    )
                    TextButton(onClick = onAddBinding) { Text("Add") }
                }
                Spacer(Modifier.height(8.dp))
                if (hasBindings) {
                    Column {
                        state.bindings.forEachIndexed { index, binding ->
                            val paused = binding.status == "paused"
                            val expanded = expandedBindingId == binding.id
                            val rawName =
                                state.providerAccountNames[binding.providerAccountId]
                                    ?: binding.providerAccountId
                            val prevExpanded =
                                index > 0 && expandedBindingId == state.bindings[index - 1].id
                            val nextExpanded =
                                index < state.bindings.lastIndex &&
                                    expandedBindingId == state.bindings[index + 1].id
                            val topRounded = expanded || index == 0 || prevExpanded
                            val bottomRounded =
                                expanded || index == state.bindings.lastIndex || nextExpanded
                            if (expanded && index > 0) Spacer(Modifier.height(8.dp))
                            Surface(
                                modifier =
                                    Modifier
                                        .fillMaxWidth()
                                        .animateContentSize(),
                                shape =
                                    RoundedCornerShape(
                                        topStart = if (topRounded) 20.dp else 0.dp,
                                        topEnd = if (topRounded) 20.dp else 0.dp,
                                        bottomStart = if (bottomRounded) 20.dp else 0.dp,
                                        bottomEnd = if (bottomRounded) 20.dp else 0.dp,
                                    ),
                                color = MaterialTheme.colorScheme.surfaceBright,
                            ) {
                                Column {
                                    val chevronRotation by animateFloatAsState(if (expanded) 180f else 0f)
                                    ListItem(
                                        modifier =
                                            Modifier
                                                .clickable {
                                                    expandedBindingId = if (expanded) null else binding.id
                                                }.alpha(if (paused) 0.55f else 1f),
                                        colors =
                                            ListItemDefaults.colors(
                                                containerColor = MaterialTheme.colorScheme.surfaceBright,
                                            ),
                                        headlineContent = { Text(humanizeAccountName(rawName)) },
                                        supportingContent = {
                                            Column {
                                                Text(
                                                    "Writes into ${binding.svertoAccountName}",
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                                val sync =
                                                    binding.lastSyncAt?.let {
                                                        "Last synced ${relativeTime(it)}" +
                                                            (binding.lastSyncStatus?.let { s -> " · $s" } ?: "")
                                                    } ?: "Never synced"
                                                Text(
                                                    text = binding.lastSyncError ?: sync,
                                                    color =
                                                        if (binding.lastSyncError != null) {
                                                            MaterialTheme.colorScheme.error
                                                        } else {
                                                            MaterialTheme.colorScheme.onSurfaceVariant
                                                        },
                                                )
                                            }
                                        },
                                        trailingContent = {
                                            Icon(
                                                Icons.Filled.ExpandMore,
                                                contentDescription = if (expanded) "Collapse" else "Expand",
                                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                                modifier = Modifier.rotate(chevronRotation),
                                            )
                                        },
                                    )
                                    if (expanded) {
                                        ListItem(
                                            modifier =
                                                Modifier.clickable {
                                                    onOpenAccount(binding.providerAccountId, rawName)
                                                },
                                            colors =
                                                ListItemDefaults.colors(
                                                    containerColor = MaterialTheme.colorScheme.surfaceBright,
                                                ),
                                            headlineContent = { Text("View transactions") },
                                            trailingContent = {
                                                Icon(
                                                    Icons.AutoMirrored.Filled.KeyboardArrowRight,
                                                    contentDescription = null,
                                                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                                )
                                            },
                                        )
                                        ListItem(
                                            colors =
                                                ListItemDefaults.colors(
                                                    containerColor = MaterialTheme.colorScheme.surfaceBright,
                                                ),
                                            headlineContent = { Text("Trusted writes") },
                                            supportingContent = {
                                                Text(
                                                    "Off: imports arrive as ghosts pending your review. " +
                                                        "On: imports are normal transactions.",
                                                )
                                            },
                                            trailingContent = {
                                                Switch(
                                                    checked = binding.writeMode == BindingWriteMode.TRUSTED,
                                                    onCheckedChange = { checked ->
                                                        viewModel.updateBinding(
                                                            binding,
                                                            if (checked) BindingWriteMode.TRUSTED else BindingWriteMode.GHOST,
                                                            if (paused) BindingStatus.PAUSED else BindingStatus.ACTIVE,
                                                        )
                                                    },
                                                )
                                            },
                                        )
                                        ListItem(
                                            colors =
                                                ListItemDefaults.colors(
                                                    containerColor = MaterialTheme.colorScheme.surfaceBright,
                                                ),
                                            headlineContent = { Text("Enabled") },
                                            supportingContent = { Text("Paused bindings are skipped when syncing.") },
                                            trailingContent = {
                                                Switch(
                                                    checked = !paused,
                                                    onCheckedChange = { checked ->
                                                        viewModel.updateBinding(
                                                            binding,
                                                            binding.writeMode,
                                                            if (checked) BindingStatus.ACTIVE else BindingStatus.PAUSED,
                                                        )
                                                    },
                                                )
                                            },
                                        )
                                        ListItem(
                                            modifier = Modifier.clickable { deleteBindingId = binding.id },
                                            colors =
                                                ListItemDefaults.colors(
                                                    containerColor = MaterialTheme.colorScheme.surfaceBright,
                                                ),
                                            headlineContent = {
                                                Text(
                                                    "Remove linked account",
                                                    color = MaterialTheme.colorScheme.error,
                                                )
                                            },
                                            trailingContent = {
                                                Icon(
                                                    Icons.Outlined.Delete,
                                                    contentDescription = "Remove linked account",
                                                    tint = MaterialTheme.colorScheme.error,
                                                )
                                            },
                                        )
                                    }
                                }
                            }
                            if (expanded && index < state.bindings.lastIndex) {
                                Spacer(Modifier.height(8.dp))
                            } else if (index < state.bindings.lastIndex && !nextExpanded) {
                                HorizontalDivider()
                            }
                        }
                    }
                    Spacer(Modifier.height(32.dp))
                } else if (state.loading) {
                    BindingRowsSkeleton(rows = 1)
                    Spacer(Modifier.height(32.dp))
                } else {
                    Box(
                        modifier =
                            Modifier
                                .weight(1f)
                                .fillMaxWidth(),
                        contentAlignment = Alignment.Center,
                    ) {
                        EmptyState(
                            icon = "link",
                            title = "No accounts linked yet",
                            body = "Link an account so imported transactions know where to go.",
                        )
                    }
                }
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    OutlinedButton(
                        onClick = { showRevokeConfirm = true },
                        colors =
                            ButtonDefaults.outlinedButtonColors(
                                contentColor = MaterialTheme.colorScheme.error,
                            ),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.error),
                    ) { Text("Revoke connection") }
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    }

    deleteBindingId?.let { bindingId ->
        AlertDialog(
            onDismissRequest = { deleteBindingId = null },
            title = { Text("Remove linked account") },
            text = { Text("Are you sure you want to remove this linked account? This cannot be undone.") },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.deleteBinding(bindingId, connectionId)
                    deleteBindingId = null
                }) {
                    Text("Remove", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { deleteBindingId = null }) { Text("Cancel") }
            },
        )
    }

    if (showRevokeConfirm) {
        AlertDialog(
            onDismissRequest = { showRevokeConfirm = false },
            title = { Text("Revoke connection") },
            text = { Text("Are you sure you want to revoke this connection? Linked accounts will stop syncing.") },
            confirmButton = {
                TextButton(onClick = {
                    showRevokeConfirm = false
                    viewModel.revoke(connectionId, onDone = onRevoked)
                }) {
                    Text("Revoke", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showRevokeConfirm = false }) { Text("Cancel") }
            },
        )
    }
}
