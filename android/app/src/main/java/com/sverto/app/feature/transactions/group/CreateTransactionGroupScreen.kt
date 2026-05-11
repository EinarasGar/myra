package com.sverto.app.feature.transactions.group

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.ArrowOutward
import androidx.compose.material.icons.outlined.CalendarToday
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.LoadingIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sverto.app.core.SvertoViewModelFactory
import com.sverto.app.feature.transactions.NewTransactionSheet
import com.sverto.app.feature.transactions.create.CorrectionInput
import com.sverto.app.feature.transactions.create.CorrectionTypeChange
import com.sverto.app.feature.transactions.create.apiTypeToConfigKey
import uniffi.sverto_core.CategoryItem
import uniffi.sverto_core.TransactionListItem
import java.time.Instant
import java.time.ZoneId
import android.annotation.SuppressLint
import java.time.format.DateTimeFormatter
import java.util.Locale

@SuppressLint("NewApi")
private val dateFormatter = DateTimeFormatter.ofPattern("MMM d, yyyy 'at' h:mm a", Locale.US)

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
@Suppress("LongMethod")
fun CreateTransactionGroupScreen(
    onDiscard: () -> Unit,
    onSuccess: () -> Unit,
    onAddTransaction: (String) -> Unit,
    onEditTransaction: (Int, String) -> Unit,
    modifier: Modifier = Modifier,
    editGroupId: String? = null,
    editGroup: TransactionListItem? = null,
    quickUploadId: String? = null,
    onCorrectionTypeChanged: ((CorrectionTypeChange) -> Unit)? = null,
    viewModel: CreateTransactionGroupViewModel = viewModel(factory = SvertoViewModelFactory),
) {
    val formState by viewModel.formState.collectAsStateWithLifecycle()
    val categoryResults by viewModel.categoryResults.collectAsStateWithLifecycle()
    val submitState by viewModel.submitState.collectAsStateWithLifecycle()
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
    val errorMessage by viewModel.errorMessage.collectAsStateWithLifecycle()
    val qUploadId by viewModel.quickUploadId.collectAsStateWithLifecycle()
    val correctionState by viewModel.correctionState.collectAsStateWithLifecycle()
    val correctionTypeChange by viewModel.correctionTypeChange.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(correctionTypeChange) {
        correctionTypeChange?.let { onCorrectionTypeChanged?.invoke(it) }
    }
    val currentOnSuccess by rememberUpdatedState(onSuccess)
    val isEditMode = editGroupId != null

    var showTypePicker by remember { mutableStateOf(false) }
    var showDatePicker by remember { mutableStateOf(false) }
    var showCategorySearch by remember { mutableStateOf(false) }

    LaunchedEffect(editGroupId) {
        if (editGroup != null) {
            viewModel.initForEdit(editGroup)
        } else if (quickUploadId == null) {
            viewModel.init()
        }
    }

    LaunchedEffect(submitState) {
        if (submitState == GroupSubmitState.SUCCESS) {
            currentOnSuccess()
        }
    }

    LaunchedEffect(errorMessage) {
        errorMessage?.let { snackbarHostState.showSnackbar(it) }
    }

    AnimatedContent(
        targetState = showCategorySearch,
        transitionSpec = { fadeIn() togetherWith fadeOut() },
        label = "group_scene",
    ) { isCategorySearch ->
        if (isCategorySearch) {
            CategorySearchForGroup(
                results = categoryResults,
                onQueryChange = viewModel::searchCategories,
                onSelect = { category ->
                    viewModel.selectCategory(category)
                    showCategorySearch = false
                },
                onBack = { showCategorySearch = false },
            )
        } else {
            Scaffold(
                modifier = modifier.fillMaxSize(),
                snackbarHost = { SnackbarHost(snackbarHostState) },
                topBar = {
                    TopAppBar(
                        title = {
                            Text(
                                text = if (isEditMode) "Edit Group" else "New Group",
                                fontWeight = FontWeight.SemiBold,
                            )
                        },
                        navigationIcon = {
                            IconButton(onClick = onDiscard) {
                                Icon(Icons.Default.Close, contentDescription = "Discard")
                            }
                        },
                        colors =
                            TopAppBarDefaults.topAppBarColors(
                                containerColor = MaterialTheme.colorScheme.surface,
                            ),
                    )
                },
                bottomBar = {
                    GroupSaveBar(
                        submitState = submitState,
                        isEditMode = isEditMode,
                        enabled = formState.transactions.isNotEmpty(),
                        onSubmit = viewModel::submit,
                    )
                },
                containerColor = MaterialTheme.colorScheme.surface,
            ) { innerPadding ->
                Column(
                    modifier =
                        Modifier
                            .fillMaxSize()
                            .padding(innerPadding)
                            .verticalScroll(rememberScrollState())
                            .padding(horizontal = 20.dp),
                ) {
                    Spacer(Modifier.height(8.dp))

                    Text(
                        text = "Date",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(4.dp))
                    Surface(
                        shape = MaterialTheme.shapes.large,
                        color = MaterialTheme.colorScheme.surfaceContainerHigh,
                        modifier = Modifier.fillMaxWidth().clickable { showDatePicker = true },
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = formState.date?.let { formatDate(it) } ?: "Select date",
                                style = MaterialTheme.typography.bodyLarge,
                                color =
                                    if (formState.date != null) {
                                        MaterialTheme.colorScheme.onSurface
                                    } else {
                                        MaterialTheme.colorScheme.onSurfaceVariant
                                    },
                            )
                            Icon(
                                Icons.Outlined.CalendarToday,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(20.dp),
                            )
                        }
                    }

                    Spacer(Modifier.height(16.dp))

                    OutlinedTextField(
                        value = formState.description,
                        onValueChange = viewModel::updateDescription,
                        label = { Text("Description") },
                        placeholder = { Text("e.g. Primark Shopping") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = MaterialTheme.shapes.large,
                        colors =
                            OutlinedTextFieldDefaults.colors(
                                focusedContainerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
                                unfocusedContainerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
                            ),
                    )

                    Spacer(Modifier.height(16.dp))

                    Text(
                        text = "Category",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(4.dp))
                    Surface(
                        shape = MaterialTheme.shapes.large,
                        color = MaterialTheme.colorScheme.surfaceContainerHigh,
                        modifier =
                            Modifier.fillMaxWidth().clickable {
                                viewModel.searchCategories("")
                                showCategorySearch = true
                            },
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = formState.categoryName.ifEmpty { "Select category" },
                                style = MaterialTheme.typography.bodyLarge,
                                color =
                                    if (formState.categoryName.isNotEmpty()) {
                                        MaterialTheme.colorScheme.onSurface
                                    } else {
                                        MaterialTheme.colorScheme.onSurfaceVariant
                                    },
                            )
                            Icon(
                                Icons.Outlined.Category,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(20.dp),
                            )
                        }
                    }

                    Spacer(Modifier.height(24.dp))

                    Text(
                        text = "Transactions (${formState.transactions.size})",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                    )

                    Spacer(Modifier.height(12.dp))

                    if (formState.transactions.isNotEmpty()) {
                        Surface(
                            shape = RoundedCornerShape(18.dp),
                            color = MaterialTheme.colorScheme.surfaceContainerHigh,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Column {
                                formState.transactions.forEachIndexed { index, item ->
                                    GroupTransactionRow(
                                        index = index,
                                        item = item,
                                        onClick = {
                                            val configKey = apiTypeToConfigKey(item.input.typeKey)
                                            onEditTransaction(index, configKey)
                                        },
                                        onRemove = { viewModel.removeTransaction(index) },
                                    )
                                    if (index < formState.transactions.lastIndex) {
                                        HorizontalDivider(
                                            modifier = Modifier.padding(horizontal = 16.dp),
                                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f),
                                        )
                                    }
                                }
                            }
                        }
                        Spacer(Modifier.height(12.dp))
                    }

                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = MaterialTheme.colorScheme.surface,
                        border =
                            BorderStroke(
                                width = 2.dp,
                                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.3f),
                            ),
                        modifier = Modifier.fillMaxWidth().clickable { showTypePicker = true },
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                Icons.Default.Add,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(20.dp),
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(
                                text = "Add Transaction",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        }
                    }

                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = "${formState.transactions.size} transactions",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.fillMaxWidth(),
                    )

                    val effectiveQuickUploadId = qUploadId ?: quickUploadId
                    if (effectiveQuickUploadId != null) {
                        Spacer(Modifier.height(16.dp))
                        CorrectionInput(
                            state = correctionState,
                            onSend = { viewModel.sendCorrection(it) },
                        )
                    }

                    Spacer(Modifier.height(24.dp))
                }
            }
        }
    }

    if (showTypePicker) {
        NewTransactionSheet(
            onDismiss = { showTypePicker = false },
            onSelectType = { typeKey ->
                showTypePicker = false
                onAddTransaction(typeKey)
            },
            showGroupOption = false,
        )
    }

    if (showDatePicker) {
        val datePickerState =
            rememberDatePickerState(
                initialSelectedDateMillis = (formState.date ?: (System.currentTimeMillis() / 1000)) * 1000,
            )
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    datePickerState.selectedDateMillis?.let { viewModel.updateDate(it) }
                    showDatePicker = false
                }) { Text("OK") }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) { Text("Cancel") }
            },
        ) {
            DatePicker(state = datePickerState)
        }
    }

    if (isLoading) {
        Surface(
            color = MaterialTheme.colorScheme.surface.copy(alpha = 0.92f),
            modifier = Modifier.fillMaxSize(),
        ) {
            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                LoadingIndicator()
            }
        }
    }
}

@Composable
private fun GroupTransactionRow(
    index: Int,
    item: GroupTransactionItem,
    onClick: () -> Unit,
    onRemove: () -> Unit,
) {
    ListItem(
        modifier = Modifier.clickable(onClick = onClick),
        colors =
            ListItemDefaults.colors(
                containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
            ),
        leadingContent = {
            Text(
                text = "${index + 1}.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        },
        headlineContent = {
            Text(
                text = item.descriptionDisplay,
                style = MaterialTheme.typography.bodyLarge,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        },
        supportingContent = {
            Text(
                text = "${item.typeLabel} · ${item.amountDisplay}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        },
        trailingContent = {
            Surface(
                onClick = onRemove,
                shape = CircleShape,
                color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.35f),
                modifier = Modifier.size(28.dp),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "Remove",
                        tint = MaterialTheme.colorScheme.error,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
        },
    )
}

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun GroupSaveBar(
    submitState: GroupSubmitState,
    isEditMode: Boolean,
    enabled: Boolean,
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
            val submitting = submitState == GroupSubmitState.SUBMITTING
            Button(
                onClick = onSubmit,
                enabled = enabled && !submitting,
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
                        Icon(Icons.Outlined.ArrowOutward, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text(
                            text = if (isEditMode) "Update Group" else "Save Group",
                            style = MaterialTheme.typography.titleMedium,
                        )
                    }
                }
            }
        }
    }
}

@SuppressLint("NewApi")
private fun formatDate(epochSeconds: Long): String =
    Instant
        .ofEpochSecond(epochSeconds)
        .atZone(ZoneId.systemDefault())
        .format(dateFormatter)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CategorySearchForGroup(
    results: List<CategoryItem>,
    onQueryChange: (String) -> Unit,
    onSelect: (CategoryItem) -> Unit,
    onBack: () -> Unit,
) {
    var query by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Search Category") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.Close, contentDescription = "Back")
                    }
                },
                colors =
                    TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surface,
                    ),
            )
        },
        containerColor = MaterialTheme.colorScheme.surface,
    ) { innerPadding ->
        Column(modifier = Modifier.fillMaxSize().padding(innerPadding)) {
            OutlinedTextField(
                value = query,
                onValueChange = {
                    query = it
                    onQueryChange(it)
                },
                placeholder = { Text("Search categories...") },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                singleLine = true,
                shape = MaterialTheme.shapes.large,
            )
            androidx.compose.foundation.lazy.LazyColumn {
                items(results.size) { index ->
                    val category = results[index]
                    ListItem(
                        headlineContent = { Text(category.name) },
                        modifier = Modifier.clickable { onSelect(category) },
                    )
                }
            }
        }
    }
}
