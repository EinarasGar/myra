package com.sverto.app.feature.accounts

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.InputChip
import androidx.compose.material3.InputChipDefaults
import androidx.compose.material3.LoadingIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MediumFlexibleTopAppBar
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.ToggleButton
import androidx.compose.material3.ToggleButtonDefaults
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sverto.app.core.SvertoViewModelFactory
import com.sverto.app.feature.accounts.components.accountTypeContainerColor
import com.sverto.app.feature.accounts.components.accountTypeIcon
import com.sverto.app.feature.accounts.components.accountTypeOnContainerColor
import uniffi.sverto_core.AccountIdentifier
import uniffi.sverto_core.AccountTypeItem

// Target tile width; the grid fits as many columns as comfortably fit, clamped to 2..4.
private val ACCOUNT_TYPE_MIN_TILE = 96.dp
private const val ACCOUNT_TYPE_MIN_COLUMNS = 2
private const val ACCOUNT_TYPE_MAX_COLUMNS = 4

private const val LIQUIDITY_LIQUID_ID = 1

@OptIn(
    ExperimentalMaterial3Api::class,
    ExperimentalMaterial3ExpressiveApi::class,
)
@Composable
fun AddAccountScreen(
    onBack: () -> Unit,
    onSuccess: () -> Unit,
    modifier: Modifier = Modifier,
    accountId: String? = null,
    viewModel: AddAccountViewModel = viewModel(factory = SvertoViewModelFactory),
) {
    val name by viewModel.name.collectAsStateWithLifecycle()
    val selectedTypeId by viewModel.selectedTypeId.collectAsStateWithLifecycle()
    val selectedLiquidityId by viewModel.selectedLiquidityId.collectAsStateWithLifecycle()
    val ownershipShare by viewModel.ownershipShare.collectAsStateWithLifecycle()
    val identifiers by viewModel.identifiers.collectAsStateWithLifecycle()
    val accountTypes by viewModel.accountTypes.collectAsStateWithLifecycle()
    val typesLoading by viewModel.typesLoading.collectAsStateWithLifecycle()
    val submitState by viewModel.submitState.collectAsStateWithLifecycle()
    val isValid by viewModel.isValid.collectAsStateWithLifecycle()

    val snackbarHostState = remember { SnackbarHostState() }

    val isEditing = accountId != null

    LaunchedEffect(accountId) {
        if (accountId != null) {
            viewModel.loadForEdit(accountId)
        }
    }

    LaunchedEffect(submitState) {
        if (submitState is SubmitState.Error) {
            snackbarHostState.showSnackbar((submitState as SubmitState.Error).message)
            viewModel.clearError()
        }
    }

    val isLoading = submitState is SubmitState.Loading

    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()

    Scaffold(
        topBar = {
            MediumFlexibleTopAppBar(
                title = { Text(if (isEditing) "Edit account" else "Add account") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                        )
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
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            SaveBar(
                isLoading = isLoading,
                enabled = isValid && !isLoading,
                onSave = { viewModel.save(onSuccess) },
            )
        },
        modifier = modifier.fillMaxSize().nestedScroll(scrollBehavior.nestedScrollConnection),
    ) { innerPadding ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(28.dp),
        ) {
            Spacer(Modifier.height(8.dp))

            val nameError = name.isNotEmpty() && name.isBlank()
            OutlinedTextField(
                value = name,
                onValueChange = { viewModel.name.value = it },
                label = { Text("Account name") },
                singleLine = true,
                shape = RoundedCornerShape(16.dp),
                isError = nameError,
                supportingText =
                    if (nameError) {
                        { Text("Name is required") }
                    } else {
                        null
                    },
                keyboardOptions =
                    KeyboardOptions(
                        capitalization = KeyboardCapitalization.Words,
                    ),
                enabled = !isLoading,
                modifier = Modifier.fillMaxWidth(),
            )

            FieldSection(title = "Account type") {
                AccountTypePicker(
                    types = accountTypes,
                    loading = typesLoading,
                    selectedTypeId = selectedTypeId,
                    enabled = !isLoading,
                    onSelect = { typeId ->
                        viewModel.selectedTypeId.value =
                            if (selectedTypeId == typeId) null else typeId
                    },
                )
            }

            FieldSection(title = "Liquidity") {
                LiquiditySelector(
                    selectedLiquidityId = selectedLiquidityId,
                    enabled = !isLoading,
                    onSelect = { viewModel.selectedLiquidityId.value = it },
                )
            }

            OwnershipSection(
                ownershipShare = ownershipShare,
                enabled = !isLoading,
                onChange = { viewModel.ownershipShare.value = it },
            )

            FieldSection(title = "Account identifiers") {
                AccountIdentifiersField(
                    identifiers = identifiers,
                    enabled = !isLoading,
                    onAdd = { kind, raw -> viewModel.addIdentifier(kind, raw) },
                    onRemove = { viewModel.removeIdentifier(it) },
                )
            }

            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
private fun FieldSection(
    title: String,
    content: @Composable () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.onSurface,
        )
        content()
    }
}

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun AccountTypePicker(
    types: List<AccountTypeItem>,
    loading: Boolean,
    selectedTypeId: Int?,
    enabled: Boolean,
    onSelect: (Int) -> Unit,
) {
    when {
        types.isEmpty() && loading -> {
            Box(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .height(96.dp),
                contentAlignment = Alignment.Center,
            ) {
                LoadingIndicator()
            }
        }

        types.isEmpty() -> {
            Text(
                text = "Couldn't load account types. Check your connection and try again.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        else -> {
            val gap = 12.dp
            BoxWithConstraints {
                // Equal-weight tiles in chunked rows avoid any pixel-rounding wrap; the column
                // count adapts to the available width so phones land on 3 and tablets on 4.
                val columns =
                    ((maxWidth.value + gap.value) / (ACCOUNT_TYPE_MIN_TILE.value + gap.value))
                        .toInt()
                        .coerceIn(ACCOUNT_TYPE_MIN_COLUMNS, ACCOUNT_TYPE_MAX_COLUMNS)
                Column(verticalArrangement = Arrangement.spacedBy(gap)) {
                    types.chunked(columns).forEach { rowTypes ->
                        Row(horizontalArrangement = Arrangement.spacedBy(gap)) {
                            rowTypes.forEach { type ->
                                AccountTypeCard(
                                    typeId = type.id,
                                    label = type.name,
                                    selected = selectedTypeId == type.id,
                                    enabled = enabled,
                                    onClick = { onSelect(type.id) },
                                    modifier = Modifier.weight(1f),
                                )
                            }
                            // Keep the last row's tiles the same width as full rows.
                            repeat(columns - rowTypes.size) {
                                Spacer(Modifier.weight(1f))
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun AccountTypeCard(
    typeId: Int,
    label: String,
    selected: Boolean,
    enabled: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val containerColor =
        if (selected) {
            MaterialTheme.colorScheme.surfaceVariant
        } else {
            // surfaceContainer matches the screen background; bump unselected tiles to
            // surfaceContainerHigh so they read as distinct surfaces, not just a border.
            MaterialTheme.colorScheme.surfaceContainerHigh
        }
    val border =
        if (selected) {
            BorderStroke(2.dp, MaterialTheme.colorScheme.primary)
        } else {
            BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
        }
    // Shape morphs rounder on selection for an expressive selected state.
    val cornerRadius by animateDpAsState(
        targetValue = if (selected) 28.dp else 20.dp,
        animationSpec = MaterialTheme.motionScheme.fastSpatialSpec(),
        label = "accountTypeCornerRadius",
    )

    Surface(
        onClick = onClick,
        enabled = enabled,
        shape = RoundedCornerShape(cornerRadius),
        color = containerColor,
        border = border,
        modifier = modifier,
    ) {
        Column(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .height(116.dp)
                    .padding(horizontal = 8.dp, vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Box(
                modifier =
                    Modifier
                        .size(48.dp)
                        .background(accountTypeContainerColor(typeId), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = accountTypeIcon(typeId),
                    contentDescription = null,
                    tint = accountTypeOnContainerColor(typeId),
                    modifier = Modifier.size(24.dp),
                )
            }
            Spacer(Modifier.height(8.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun LiquiditySelector(
    selectedLiquidityId: Int?,
    enabled: Boolean,
    onSelect: (Int) -> Unit,
) {
    // Single liquidity option is modelled, so this is a lone expressive ToggleButton rather than a
    // connected ButtonGroup (a connected group needs two or more segments).
    ToggleButton(
        checked = selectedLiquidityId == LIQUIDITY_LIQUID_ID,
        onCheckedChange = { onSelect(LIQUIDITY_LIQUID_ID) },
        enabled = enabled,
        shapes = ToggleButtonDefaults.shapes(),
    ) {
        Text("Liquid", maxLines = 1)
    }
}

@Composable
private fun OwnershipSection(
    ownershipShare: Float,
    enabled: Boolean,
    onChange: (Float) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = "Ownership",
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Text(
            text = "${(ownershipShare * 100).toInt()}%",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.primary,
        )
        Slider(
            value = ownershipShare,
            onValueChange = onChange,
            valueRange = 0.1f..1.0f,
            steps = 8,
            enabled = enabled,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

private val IDENTIFIER_KINDS =
    listOf("card_last4" to "Card ending", "account_number" to "Account number", "iban" to "IBAN")

@OptIn(ExperimentalMaterial3ExpressiveApi::class, ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
private fun AccountIdentifiersField(
    identifiers: List<AccountIdentifier>,
    enabled: Boolean,
    onAdd: (String, String) -> String?,
    onRemove: (AccountIdentifier) -> Unit,
) {
    var showAddDialog by remember { mutableStateOf(false) }

    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        identifiers.forEach { id ->
            val label = IDENTIFIER_KINDS.firstOrNull { it.first == id.kind }?.second ?: id.kind
            val shown =
                if (id.kind == "iban" && id.value.length > 12) {
                    "${id.value.take(4)}…${id.value.takeLast(4)}"
                } else {
                    id.value
                }
            InputChip(
                selected = false,
                onClick = { onRemove(id) },
                label = { Text("$label: $shown") },
                enabled = enabled,
                trailingIcon = {
                    Icon(
                        imageVector = Icons.Filled.Close,
                        contentDescription = "Remove $label $shown",
                        modifier = Modifier.size(InputChipDefaults.IconSize),
                    )
                },
            )
        }
        AssistChip(
            onClick = { showAddDialog = true },
            label = { Text("Add") },
            enabled = enabled,
            leadingIcon = {
                Icon(
                    imageVector = Icons.Filled.Add,
                    contentDescription = null,
                    modifier = Modifier.size(AssistChipDefaults.IconSize),
                )
            },
        )
    }

    if (showAddDialog) {
        AddIdentifierDialog(
            onAdd = onAdd,
            onDismiss = { showAddDialog = false },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddIdentifierDialog(
    onAdd: (String, String) -> String?,
    onDismiss: () -> Unit,
) {
    var kind by remember { mutableStateOf(IDENTIFIER_KINDS.first().first) }
    var value by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var menuOpen by remember { mutableStateOf(false) }
    val kindLabel = IDENTIFIER_KINDS.firstOrNull { it.first == kind }?.second ?: kind

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add identifier") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Box {
                    OutlinedTextField(
                        value = kindLabel,
                        onValueChange = {},
                        readOnly = true,
                        enabled = false,
                        label = { Text("Type") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Box(
                        Modifier
                            .matchParentSize()
                            .clickable { menuOpen = true },
                    )
                    DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                        IDENTIFIER_KINDS.forEach { (k, label) ->
                            DropdownMenuItem(
                                text = { Text(label) },
                                onClick = {
                                    kind = k
                                    value = ""
                                    error = null
                                    menuOpen = false
                                },
                            )
                        }
                    }
                }
                OutlinedTextField(
                    value = value,
                    onValueChange = {
                        value = it
                        error = null
                    },
                    label = { Text(if (kind == "iban") "IBAN" else "Value") },
                    singleLine = true,
                    isError = error != null,
                    supportingText = error?.let { { Text(it) } },
                    keyboardOptions =
                        KeyboardOptions(
                            keyboardType = if (kind == "iban") KeyboardType.Text else KeyboardType.NumberPassword,
                        ),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val err = onAdd(kind, value)
                    if (err == null) onDismiss() else error = err
                },
                enabled = value.isNotBlank(),
            ) { Text("Add") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun SaveBar(
    isLoading: Boolean,
    enabled: Boolean,
    onSave: () -> Unit,
) {
    Surface(color = MaterialTheme.colorScheme.surfaceContainer) {
        Button(
            onClick = onSave,
            enabled = enabled,
            modifier =
                Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .imePadding()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
                    .height(56.dp),
        ) {
            if (isLoading) {
                LoadingIndicator(color = MaterialTheme.colorScheme.onPrimary)
            } else {
                Text(
                    text = "Save account",
                    style = MaterialTheme.typography.titleMedium,
                )
            }
        }
    }
}
