package com.sverto.app.feature.transactions.create

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionLayout
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.ArrowOutward
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LoadingIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import uniffi.sverto_core.TransactionListItem

private enum class SearchTarget { PRIMARY_ASSET, SECONDARY_ASSET, ORIGIN_ASSET }

private sealed interface Scene {
    data object Form : Scene

    data class AssetSearch(
        val target: SearchTarget,
    ) : Scene

    data object CategorySearch : Scene
}

private fun assetSharedKey(target: SearchTarget): String =
    when (target) {
        SearchTarget.PRIMARY_ASSET -> "asset_field_primary"
        SearchTarget.SECONDARY_ASSET -> "asset_field_secondary"
        SearchTarget.ORIGIN_ASSET -> "asset_field_origin"
    }

private const val CATEGORY_SHARED_KEY = "category_field"

@OptIn(
    ExperimentalMaterial3Api::class,
    ExperimentalMaterial3ExpressiveApi::class,
    ExperimentalSharedTransitionApi::class,
)
@Composable
@Suppress("LongMethod")
fun CreateTransactionScreen(
    typeKey: String,
    onDiscard: () -> Unit,
    onSuccess: (TransactionListItem?) -> Unit,
    modifier: Modifier = Modifier,
    editTransactionId: String? = null,
    viewModel: CreateTransactionViewModel = viewModel(),
) {
    val config = remember(typeKey) { getTransactionTypeConfig(typeKey) }
    val formState by viewModel.formState.collectAsStateWithLifecycle()
    val accounts by viewModel.accounts.collectAsStateWithLifecycle()
    val assetResults by viewModel.assetResults.collectAsStateWithLifecycle()
    val categoryResults by viewModel.categoryResults.collectAsStateWithLifecycle()
    val submitState by viewModel.submitState.collectAsStateWithLifecycle()
    val submittedTransaction by viewModel.submittedTransaction.collectAsStateWithLifecycle()
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
    val errorMessage by viewModel.errorMessage.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val currentOnSuccess by rememberUpdatedState(onSuccess)

    var scene by rememberSaveable(stateSaver = sceneSaver()) { mutableStateOf<Scene>(Scene.Form) }
    var showAccountPicker by remember { mutableStateOf<AccountTarget?>(null) }

    LaunchedEffect(typeKey, editTransactionId) {
        if (editTransactionId == null) {
            viewModel.init()
        } else {
            viewModel.initForEdit(editTransactionId)
        }
    }
    LaunchedEffect(submitState) {
        if (submitState == SubmitState.SUCCESS) {
            currentOnSuccess(submittedTransaction)
        }
    }
    LaunchedEffect(errorMessage) { errorMessage?.let { snackbarHostState.showSnackbar(it) } }

    Box(modifier = modifier.fillMaxSize()) {
        SharedTransitionLayout(modifier = Modifier.fillMaxSize()) {
            val sharedScope = this
            AnimatedContent(
                targetState = scene,
                transitionSpec = { fadeIn() togetherWith fadeOut() },
                label = "create_tx_scene",
            ) { current ->
                val avScope = this
                when (current) {
                    Scene.Form ->
                        CreateTransactionForm(
                            config = config,
                            formState = formState,
                            submitState = submitState,
                            isEditMode = editTransactionId != null,
                            snackbarHostState = snackbarHostState,
                            sharedScope = sharedScope,
                            animatedVisibilityScope = avScope,
                            onDiscard = onDiscard,
                            onSubmit = { viewModel.submit(config) },
                            onSelectDate = viewModel::updateDate,
                            onPickPrimaryAccount = { showAccountPicker = AccountTarget.PRIMARY },
                            onPickSecondaryAccount = { showAccountPicker = AccountTarget.SECONDARY },
                            onPickPrimaryAsset = {
                                viewModel.searchAssets("")
                                scene = Scene.AssetSearch(SearchTarget.PRIMARY_ASSET)
                            },
                            onPickSecondaryAsset = {
                                viewModel.searchAssets("")
                                scene = Scene.AssetSearch(SearchTarget.SECONDARY_ASSET)
                            },
                            onPickOriginAsset = {
                                viewModel.searchAssets("")
                                scene = Scene.AssetSearch(SearchTarget.ORIGIN_ASSET)
                            },
                            onPickCategory = {
                                viewModel.searchCategories("")
                                scene = Scene.CategorySearch
                            },
                            onChangePrimaryAmount = viewModel::updatePrimaryAmount,
                            onChangeSecondaryAmount = viewModel::updateSecondaryAmount,
                            onChangeDescription = viewModel::updateDescription,
                        )

                    is Scene.AssetSearch ->
                        with(sharedScope) {
                            AssetSearchScene(
                                sharedKey = assetSharedKey(current.target),
                                results = assetResults,
                                onQueryChange = viewModel::searchAssets,
                                onSelect = { asset ->
                                    when (current.target) {
                                        SearchTarget.PRIMARY_ASSET ->
                                            viewModel.updatePrimaryAsset(asset)
                                        SearchTarget.SECONDARY_ASSET ->
                                            viewModel.updateSecondaryAsset(asset)
                                        SearchTarget.ORIGIN_ASSET ->
                                            viewModel.selectOriginAsset(asset)
                                    }
                                    scene = Scene.Form
                                },
                                onBack = { scene = Scene.Form },
                                animatedVisibilityScope = avScope,
                            )
                        }

                    Scene.CategorySearch ->
                        with(sharedScope) {
                            CategorySearchScene(
                                sharedKey = CATEGORY_SHARED_KEY,
                                results = categoryResults,
                                onQueryChange = viewModel::searchCategories,
                                onSelect = { category ->
                                    viewModel.selectCategory(category)
                                    scene = Scene.Form
                                },
                                onBack = { scene = Scene.Form },
                                animatedVisibilityScope = avScope,
                            )
                        }
                }
            }
        }

        showAccountPicker?.let { target ->
            AccountPickerSheet(
                accounts = accounts,
                selectedAccountId =
                    when (target) {
                        AccountTarget.PRIMARY -> formState.primaryEntry.accountId
                        AccountTarget.SECONDARY -> formState.secondaryEntry.accountId
                    },
                onSelect = { account ->
                    when (target) {
                        AccountTarget.PRIMARY -> viewModel.updatePrimaryAccount(account)
                        AccountTarget.SECONDARY -> viewModel.updateSecondaryAccount(account)
                    }
                    showAccountPicker = null
                },
                onDismiss = { showAccountPicker = null },
            )
        }

        if (isLoading) {
            Surface(
                color = MaterialTheme.colorScheme.surface.copy(alpha = 0.92f),
                modifier = Modifier.fillMaxSize(),
            ) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier.fillMaxSize(),
                ) {
                    LoadingIndicator()
                }
            }
        }
    }
}

private enum class AccountTarget { PRIMARY, SECONDARY }

@OptIn(
    ExperimentalMaterial3Api::class,
    ExperimentalMaterial3ExpressiveApi::class,
    ExperimentalSharedTransitionApi::class,
)
@Composable
@Suppress("LongParameterList", "LongMethod")
private fun CreateTransactionForm(
    config: TransactionTypeConfig,
    formState: TransactionFormState,
    submitState: SubmitState,
    isEditMode: Boolean,
    snackbarHostState: SnackbarHostState,
    sharedScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
    onDiscard: () -> Unit,
    onSubmit: () -> Unit,
    onSelectDate: (Long) -> Unit,
    onPickPrimaryAccount: () -> Unit,
    onPickSecondaryAccount: () -> Unit,
    onPickPrimaryAsset: () -> Unit,
    onPickSecondaryAsset: () -> Unit,
    onPickOriginAsset: () -> Unit,
    onPickCategory: () -> Unit,
    onChangePrimaryAmount: (String) -> Unit,
    onChangeSecondaryAmount: (String) -> Unit,
    onChangeDescription: (String) -> Unit,
) {
    Scaffold(
        modifier = Modifier.fillMaxSize(),
        topBar = {
            TopAppBar(
                navigationIcon = {
                    IconButton(onClick = onDiscard) {
                        Icon(Icons.Default.Close, contentDescription = "Discard")
                    }
                },
                title = {
                    Text(
                        text = config.label,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.SemiBold,
                    )
                },
                colors =
                    TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface,
                    ),
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            SaveBar(
                submitState = submitState,
                isEditMode = isEditMode,
                onSubmit = onSubmit,
            )
        },
        containerColor = MaterialTheme.colorScheme.surface,
    ) { padding ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp)
                    .verticalScroll(rememberScrollState()),
        ) {
            Spacer(Modifier.height(8.dp))

            DateChip(
                dateEpochSeconds = formState.date,
                onSelectDate = onSelectDate,
            )

            Spacer(Modifier.height(16.dp))

            when (val mode = config.entryMode) {
                is EntryMode.Single ->
                    SingleEntrySections(
                        mode = mode,
                        formState = formState,
                        sharedScope = sharedScope,
                        animatedVisibilityScope = animatedVisibilityScope,
                        onPickAccount = onPickPrimaryAccount,
                        onPickAsset = onPickPrimaryAsset,
                        onPickOriginAsset = onPickOriginAsset,
                        onPickCategory = onPickCategory,
                        onChangeAmount = onChangePrimaryAmount,
                        onChangeDescription = onChangeDescription,
                    )

                is EntryMode.Dual ->
                    DualEntrySections(
                        mode = mode,
                        formState = formState,
                        sharedScope = sharedScope,
                        animatedVisibilityScope = animatedVisibilityScope,
                        onPickPrimaryAccount = onPickPrimaryAccount,
                        onPickSecondaryAccount = onPickSecondaryAccount,
                        onPickPrimaryAsset = onPickPrimaryAsset,
                        onPickSecondaryAsset = onPickSecondaryAsset,
                        onChangePrimaryAmount = onChangePrimaryAmount,
                        onChangeSecondaryAmount = onChangeSecondaryAmount,
                    )
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
@Suppress("LongParameterList")
private fun SingleEntrySections(
    mode: EntryMode.Single,
    formState: TransactionFormState,
    sharedScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
    onPickAccount: () -> Unit,
    onPickAsset: () -> Unit,
    onPickOriginAsset: () -> Unit,
    onPickCategory: () -> Unit,
    onChangeAmount: (String) -> Unit,
    onChangeDescription: (String) -> Unit,
) {
    HeroAmountInput(
        value = formState.primaryEntry.amount,
        onValueChange = onChangeAmount,
        sign = mode.amountSign,
    )

    Spacer(Modifier.height(16.dp))

    SectionCard(label = "Entry") {
        AccountPickerField(
            selectedName = formState.primaryEntry.accountName,
            onClick = onPickAccount,
            tint = MaterialTheme.colorScheme.primary,
        )
        Spacer(Modifier.height(8.dp))
        with(sharedScope) {
            AssetPickerField(
                selectedDisplay = formState.primaryEntry.assetDisplay,
                onClick = onPickAsset,
                tint = MaterialTheme.colorScheme.tertiary,
                modifier =
                    Modifier.sharedBounds(
                        sharedContentState =
                            rememberSharedContentState(
                                key = assetSharedKey(SearchTarget.PRIMARY_ASSET),
                            ),
                        animatedVisibilityScope = animatedVisibilityScope,
                    ),
            )
        }
    }

    if (mode.hasOriginAsset || mode.hasCategory || mode.hasDescription) {
        SectionCard(label = "Details") {
            if (mode.hasOriginAsset) {
                with(sharedScope) {
                    AssetPickerField(
                        selectedDisplay = formState.originAssetDisplay,
                        onClick = onPickOriginAsset,
                        label = "Origin asset",
                        tint = MaterialTheme.colorScheme.tertiary,
                        modifier =
                            Modifier.sharedBounds(
                                sharedContentState =
                                    rememberSharedContentState(
                                        key = assetSharedKey(SearchTarget.ORIGIN_ASSET),
                                    ),
                                animatedVisibilityScope = animatedVisibilityScope,
                            ),
                    )
                    Spacer(Modifier.height(8.dp))
                }
            }
            if (mode.hasCategory) {
                with(sharedScope) {
                    CategoryPickerFieldRow(
                        selectedName = formState.categoryName,
                        onClick = onPickCategory,
                        modifier =
                            Modifier.sharedBounds(
                                sharedContentState =
                                    rememberSharedContentState(key = CATEGORY_SHARED_KEY),
                                animatedVisibilityScope = animatedVisibilityScope,
                            ),
                    )
                    Spacer(Modifier.height(8.dp))
                }
            }
            if (mode.hasDescription) {
                DescriptionField(
                    value = formState.description,
                    onValueChange = onChangeDescription,
                )
            }
        }
    }
}

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
@Suppress("LongParameterList")
private fun DualEntrySections(
    mode: EntryMode.Dual,
    formState: TransactionFormState,
    sharedScope: SharedTransitionScope,
    animatedVisibilityScope: AnimatedVisibilityScope,
    onPickPrimaryAccount: () -> Unit,
    onPickSecondaryAccount: () -> Unit,
    onPickPrimaryAsset: () -> Unit,
    onPickSecondaryAsset: () -> Unit,
    onChangePrimaryAmount: (String) -> Unit,
    onChangeSecondaryAmount: (String) -> Unit,
) {
    if (mode.sameAccount) {
        SectionCard(label = "Account") {
            AccountPickerField(
                selectedName = formState.primaryEntry.accountName,
                onClick = onPickPrimaryAccount,
                tint = MaterialTheme.colorScheme.primary,
            )
        }
    }

    DirectionalPanel(
        label = mode.primaryLabel,
        sign = mode.primarySign,
        variant = PanelVariant.PRIMARY,
    ) {
        if (!mode.sameAccount) {
            AccountPickerField(
                selectedName = formState.primaryEntry.accountName,
                onClick = onPickPrimaryAccount,
                tint = MaterialTheme.colorScheme.primary,
            )
            Spacer(Modifier.height(8.dp))
        }
        with(sharedScope) {
            AssetPickerField(
                selectedDisplay = formState.primaryEntry.assetDisplay,
                onClick = onPickPrimaryAsset,
                tint = MaterialTheme.colorScheme.tertiary,
                modifier =
                    Modifier.sharedBounds(
                        sharedContentState =
                            rememberSharedContentState(
                                key = assetSharedKey(SearchTarget.PRIMARY_ASSET),
                            ),
                        animatedVisibilityScope = animatedVisibilityScope,
                    ),
            )
        }
        Spacer(Modifier.height(8.dp))
        PanelAmountField(
            value = formState.primaryEntry.amount,
            onValueChange = onChangePrimaryAmount,
            sign = mode.primarySign,
            label = mode.primaryAmountLabel,
        )
    }

    SwapGlyph()

    val secondaryEntry =
        if (mode.sameAccount) {
            formState.secondaryEntry.copy(
                accountId = formState.primaryEntry.accountId,
                accountName = formState.primaryEntry.accountName,
            )
        } else {
            formState.secondaryEntry
        }

    DirectionalPanel(
        label = mode.secondaryLabel,
        sign = mode.secondarySign,
        variant = PanelVariant.TERTIARY,
    ) {
        if (!mode.sameAccount) {
            AccountPickerField(
                selectedName = secondaryEntry.accountName,
                onClick = onPickSecondaryAccount,
                tint = MaterialTheme.colorScheme.primary,
            )
            Spacer(Modifier.height(8.dp))
        }
        with(sharedScope) {
            AssetPickerField(
                selectedDisplay = secondaryEntry.assetDisplay,
                onClick = onPickSecondaryAsset,
                tint = MaterialTheme.colorScheme.tertiary,
                modifier =
                    Modifier.sharedBounds(
                        sharedContentState =
                            rememberSharedContentState(
                                key = assetSharedKey(SearchTarget.SECONDARY_ASSET),
                            ),
                        animatedVisibilityScope = animatedVisibilityScope,
                    ),
            )
        }
        Spacer(Modifier.height(8.dp))
        PanelAmountField(
            value = secondaryEntry.amount,
            onValueChange = onChangeSecondaryAmount,
            sign = mode.secondarySign,
            label = mode.secondaryAmountLabel,
        )
    }
}

@Composable
private fun CategoryPickerFieldRow(
    selectedName: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    PickerField(
        label = "Category",
        value = selectedName.ifEmpty { null },
        leadingIcon = Icons.Outlined.Category,
        iconTint = MaterialTheme.colorScheme.secondary,
        placeholder = "Choose a category",
        onClick = onClick,
        modifier = modifier,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DescriptionField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text("Description") },
        modifier = modifier.fillMaxWidth(),
        singleLine = false,
        minLines = 2,
        shape = MaterialTheme.shapes.large,
        colors =
            OutlinedTextFieldDefaults.colors(
                focusedContainerColor = MaterialTheme.colorScheme.surface,
                unfocusedContainerColor = MaterialTheme.colorScheme.surface,
            ),
    )
}

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun SaveBar(
    submitState: SubmitState,
    isEditMode: Boolean,
    onSubmit: () -> Unit,
) {
    Surface(
        color = MaterialTheme.colorScheme.surface,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Box(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .imePadding()
                    .navigationBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
        ) {
            val submitting = submitState == SubmitState.SUBMITTING
            Button(
                onClick = onSubmit,
                enabled = !submitting,
                shape = MaterialTheme.shapes.extraLarge,
                colors =
                    ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary,
                    ),
                contentPadding = PaddingValues(vertical = 16.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center,
                ) {
                    if (submitting) {
                        LoadingIndicator()
                        Spacer(Modifier.width(12.dp))
                        Text(
                            text = if (isEditMode) "Updating..." else "Saving...",
                            style = MaterialTheme.typography.titleMedium,
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Outlined.ArrowOutward,
                            contentDescription = null,
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            text = if (isEditMode) "Update transaction" else "Save transaction",
                            style = MaterialTheme.typography.titleMedium,
                        )
                    }
                }
            }
        }
    }
}

private fun sceneSaver() =
    Saver<Scene, String>(
        save = { scene ->
            when (scene) {
                Scene.Form -> "form"
                is Scene.AssetSearch -> "asset:${scene.target.name}"
                Scene.CategorySearch -> "category"
            }
        },
        restore = { stored ->
            when {
                stored == "form" -> Scene.Form
                stored.startsWith("asset:") ->
                    Scene.AssetSearch(SearchTarget.valueOf(stored.removePrefix("asset:")))
                stored == "category" -> Scene.CategorySearch
                else -> Scene.Form
            }
        },
    )
