package com.sverto.app.feature.categories

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyItemScope
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeFlexibleTopAppBar
import androidx.compose.material3.LoadingIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sverto.app.core.SvertoViewModelFactory
import com.sverto.app.feature.categories.components.CategoryFormResult
import com.sverto.app.feature.categories.components.CategoryFormSheet
import com.sverto.app.feature.categories.components.CategoryRow
import com.sverto.app.feature.categories.components.CategoryTypeRow
import uniffi.sverto_core.ManagedCategory
import uniffi.sverto_core.ManagedCategoryType

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
@Suppress("LongMethod")
fun CustomCategoriesScreen(
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: CustomCategoriesViewModel = viewModel(factory = SvertoViewModelFactory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    var selectedTab by remember { mutableIntStateOf(0) }

    var categoryForm by remember { mutableStateOf<CategoryFormTarget?>(null) }
    var deleteCategory by remember { mutableStateOf<ManagedCategory?>(null) }
    var typeDialog by remember { mutableStateOf<TypeDialogTarget?>(null) }
    var deleteType by remember { mutableStateOf<ManagedCategoryType?>(null) }

    val categoriesListState = rememberLazyListState()
    val typesListState = rememberLazyListState()

    LaunchedEffect(Unit) {
        viewModel.errors.collect { msg ->
            snackbarHostState.currentSnackbarData?.dismiss()
            snackbarHostState.showSnackbar(msg)
        }
    }

    // New categories/types are added at the top of their list; reveal them when the
    // count grows (a keyed LazyColumn otherwise keeps the new item just above the viewport).
    var prevCategoryCount by remember { mutableIntStateOf(0) }
    LaunchedEffect(state.categories.size) {
        if (prevCategoryCount > 0 && state.categories.size > prevCategoryCount) {
            categoriesListState.animateScrollToItem(0)
        }
        prevCategoryCount = state.categories.size
    }
    var prevTypeCount by remember { mutableIntStateOf(0) }
    LaunchedEffect(state.types.size) {
        if (prevTypeCount > 0 && state.types.size > prevTypeCount) {
            typesListState.animateScrollToItem(0)
        }
        prevTypeCount = state.types.size
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
                title = { Text("Custom Categories") },
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
        snackbarHost = { SnackbarHost(snackbarHostState) },
        floatingActionButton = {
            FloatingActionButton(onClick = {
                if (selectedTab == 0) {
                    categoryForm = CategoryFormTarget(null)
                } else {
                    typeDialog = TypeDialogTarget(null, "")
                }
            }) {
                Icon(Icons.Filled.Add, contentDescription = "Add")
            }
        },
    ) { innerPadding ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
        ) {
            PrimaryTabRow(
                selectedTabIndex = selectedTab,
                // Defaults to `surface`, but the rest of the screen (Scaffold, TopAppBar) is
                // `surfaceContainer`; without this the tab strip renders as a darker band.
                containerColor = MaterialTheme.colorScheme.surfaceContainer,
            ) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("Categories") },
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text("Types") },
                )
            }
            if (selectedTab == 0) {
                TabBody(
                    isLoading = state.isLoading,
                    data = state.categories,
                    emptyText = "No categories yet",
                    itemKey = { it.id },
                    listState = categoriesListState,
                ) { category ->
                    CategoryRow(
                        category = category,
                        onEdit = { categoryForm = CategoryFormTarget(it) },
                        onDelete = { deleteCategory = it },
                        modifier = Modifier.animateItem(),
                    )
                }
            } else {
                TabBody(
                    isLoading = state.isLoading,
                    data = state.types,
                    emptyText = "No types yet",
                    itemKey = { it.id },
                    listState = typesListState,
                ) { type ->
                    CategoryTypeRow(
                        type = type,
                        onEdit = { typeDialog = TypeDialogTarget(it.id, it.name) },
                        onDelete = { deleteType = it },
                        modifier = Modifier.animateItem(),
                    )
                }
            }
        }
    }

    categoryForm?.let { target ->
        CategoryFormSheet(
            existing = target.category,
            types = state.types,
            onSubmit = { result: CategoryFormResult ->
                if (result.id == null) {
                    viewModel.createCategory(result.name, result.icon, result.typeId)
                } else {
                    viewModel.updateCategory(result.id, result.name, result.icon, result.typeId)
                }
                categoryForm = null
            },
            onDismiss = { categoryForm = null },
        )
    }

    deleteCategory?.let { category ->
        ConfirmDeleteDialog(
            title = "Delete category",
            message = "Delete \"${category.name}\"? This can't be undone.",
            onConfirm = {
                viewModel.deleteCategory(category.id)
                deleteCategory = null
            },
            onDismiss = { deleteCategory = null },
        )
    }

    typeDialog?.let { target ->
        TypeNameDialog(
            initialName = target.name,
            isEdit = target.id != null,
            onConfirm = { newName ->
                if (target.id == null) {
                    viewModel.createType(newName)
                } else {
                    viewModel.updateType(target.id, newName)
                }
                typeDialog = null
            },
            onDismiss = { typeDialog = null },
        )
    }

    deleteType?.let { type ->
        ConfirmDeleteDialog(
            title = "Delete type",
            message = "Delete \"${type.name}\"? Categories using it must be removed first.",
            onConfirm = {
                viewModel.deleteType(type.id)
                deleteType = null
            },
            onDismiss = { deleteType = null },
        )
    }
}

private data class CategoryFormTarget(
    val category: ManagedCategory?,
)

private data class TypeDialogTarget(
    val id: Int?,
    val name: String,
)

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun <T> TabBody(
    isLoading: Boolean,
    data: List<T>,
    emptyText: String,
    itemKey: (T) -> Any,
    listState: LazyListState,
    row: @Composable LazyItemScope.(T) -> Unit,
) {
    when {
        data.isEmpty() && isLoading ->
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                LoadingIndicator()
            }

        data.isEmpty() ->
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    text = emptyText,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

        else ->
            LazyColumn(state = listState, modifier = Modifier.fillMaxSize()) {
                items(items = data, key = { itemKey(it) }) { item -> row(item) }
            }
    }
}

@Composable
private fun ConfirmDeleteDialog(
    title: String,
    message: String,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = { Text(message) },
        confirmButton = {
            TextButton(onClick = onConfirm) {
                Text("Delete", color = MaterialTheme.colorScheme.error)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        },
    )
}

@Composable
private fun TypeNameDialog(
    initialName: String,
    isEdit: Boolean,
    onConfirm: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    var name by remember(initialName) { mutableStateOf(initialName) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (isEdit) "Edit type" else "New type") },
        text = {
            OutlinedTextField(
                value = name,
                onValueChange = { if (it.length <= 50) name = it },
                label = { Text("Name") },
                singleLine = true,
            )
        },
        confirmButton = {
            TextButton(
                enabled = name.isNotBlank(),
                onClick = { onConfirm(name.trim()) },
            ) {
                Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        },
    )
}
