package com.sverto.app

import android.util.Log
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionLayout
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.clerk.ui.userbutton.UserButton
import com.sverto.app.core.SvertoViewModelFactory
import com.sverto.app.core.navigation.TopLevelRoute
import com.sverto.app.core.theme.LocalClerkTheme
import com.sverto.app.core.ui.OfflineBanner
import com.sverto.app.feature.accounts.AccountsScreen
import com.sverto.app.feature.portfolio.PortfolioScreen
import com.sverto.app.feature.transactions.TransactionDetailScreen
import com.sverto.app.feature.transactions.TransactionsScreen
import com.sverto.app.feature.transactions.TransactionsViewModel
import com.sverto.app.feature.transactions.create.CorrectionTypeChange
import com.sverto.app.feature.transactions.create.CreateTransactionScreen
import com.sverto.app.feature.transactions.create.CreateTransactionViewModel
import com.sverto.app.feature.transactions.create.GroupEditDisplayData
import com.sverto.app.feature.transactions.create.apiTypeToConfigKey
import com.sverto.app.feature.transactions.group.CreateTransactionGroupScreen
import com.sverto.app.feature.transactions.group.CreateTransactionGroupViewModel
import com.sverto.app.feature.transactions.group.GroupTransactionItem
import com.sverto.app.feature.transactions.quickupload.QuickUploadViewModel
import com.sverto.app.feature.transactions.quickupload.QuickUploadUiItem
import uniffi.sverto_core.ConnectionStatus
import uniffi.sverto_core.TransactionListItem

private const val TRANSACTION_DETAIL_ROUTE = "transactionDetail/{txId}"
private const val CREATE_TRANSACTION_ROUTE = "createTransaction/{typeKey}"
private const val EDIT_TRANSACTION_ROUTE = "editTransaction/{typeKey}/{txId}"
private const val CREATE_GROUP_ROUTE = "createTransactionGroup"
private const val EDIT_GROUP_ROUTE = "editTransactionGroup/{groupId}"
private const val GROUP_ADD_TXN_ROUTE = "groupAddTransaction/{typeKey}"
private const val GROUP_EDIT_TXN_ROUTE = "groupEditTransaction/{typeKey}/{index}"

private data class TransactionDetailState(
    val transaction: TransactionListItem,
    val isInGroup: Boolean,
)

@Suppress("LongMethod", "ModifierMissing", "ViewModelForwarding")
@OptIn(ExperimentalMaterial3Api::class, ExperimentalSharedTransitionApi::class)
@Composable
fun MainScreen(
    transactionsViewModel: TransactionsViewModel = viewModel(factory = SvertoViewModelFactory),
    quickUploadViewModel: QuickUploadViewModel = viewModel(factory = SvertoViewModelFactory),
) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val isTopLevel = TopLevelRoute.entries.any { it.route == currentRoute }

    val transactionCache = remember { mutableMapOf<String, TransactionDetailState>() }
    val pendingGroupTransaction = remember { mutableStateOf<GroupTransactionItem?>(null) }
    val editingGroupIndex = remember { mutableStateOf<Int?>(null) }

    val quickUploadItems by quickUploadViewModel.items.collectAsStateWithLifecycle()

    val context = LocalContext.current
    val appStore = remember { (context.applicationContext as SvertoApp).appStore }

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        Log.d("MainScreen", "Photo picker result: uri=$uri")
        if (uri != null) {
            val contentResolver = context.contentResolver
            val mimeType = contentResolver.getType(uri) ?: "image/jpeg"
            val inputStream = contentResolver.openInputStream(uri)
            val imageBytes = inputStream?.readBytes()
            inputStream?.close()
            Log.d("MainScreen", "Image bytes: ${imageBytes?.size}, mimeType=$mimeType")
            if (imageBytes != null && imageBytes.size <= 10 * 1024 * 1024) {
                val bitmap = android.graphics.BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
                if (bitmap != null) {
                    val thumbWidth = 200
                    val thumbHeight = (bitmap.height * thumbWidth / bitmap.width.coerceAtLeast(1))
                    val thumbBitmap = android.graphics.Bitmap.createScaledBitmap(bitmap, thumbWidth, thumbHeight, true)
                    val thumbStream = java.io.ByteArrayOutputStream()
                    thumbBitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 60, thumbStream)
                    val thumbnailBytes = thumbStream.toByteArray()
                    Log.d("MainScreen", "Queuing upload, thumbnail=${thumbnailBytes.size}")
                    quickUploadViewModel.queueUpload(imageBytes, thumbnailBytes, mimeType)
                } else {
                    Log.e("MainScreen", "BitmapFactory.decodeByteArray returned null")
                }
            }
        }
    }

    fun navigateToDetail(
        transaction: TransactionListItem,
        isInGroup: Boolean = false,
    ) {
        transactionCache[transaction.id] =
            TransactionDetailState(
                transaction = transaction,
                isInGroup = isInGroup,
            )
        navController.navigate("transactionDetail/${transaction.id}")
    }

    val connectionStatus = remember { mutableStateOf(ConnectionStatus.ONLINE) }

    DisposableEffect(Unit) {
        val observer = object : uniffi.sverto_core.ConnectionObserver {
            override fun onConnectionStatusChanged(status: ConnectionStatus) {
                connectionStatus.value = status
            }
        }
        appStore.observeConnection(observer)
        onDispose {
            appStore.unobserveConnection()
        }
    }

    SharedTransitionLayout {
        val sharedScope = this

        Scaffold(
            modifier = Modifier.fillMaxSize(),
            containerColor = MaterialTheme.colorScheme.surface,
            topBar = {
                Column {
                    AnimatedVisibility(
                        visible = isTopLevel,
                        enter = slideInVertically(initialOffsetY = { -it }) + fadeIn(),
                        exit = slideOutVertically(targetOffsetY = { -it }) + fadeOut(),
                    ) {
                        CenterAlignedTopAppBar(
                            navigationIcon = {
                                IconButton(onClick = { /* drawer */ }) {
                                    Icon(Icons.Default.Menu, contentDescription = "Menu")
                                }
                            },
                            title = {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        painter = painterResource(id = R.drawable.ic_sverto_logo),
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.height(24.dp),
                                    )
                                    Spacer(Modifier.width(8.dp))
                                    Text("Sverto")
                                }
                            },
                            actions = {
                                if (BuildConfig.CLERK_PUBLISHABLE_KEY.isNotBlank()) {
                                    UserButton(clerkTheme = LocalClerkTheme.current)
                                }
                            },
                            colors =
                                TopAppBarDefaults.topAppBarColors(
                                    containerColor = MaterialTheme.colorScheme.surface,
                                ),
                        )
                    }
                    OfflineBanner(status = connectionStatus.value)
                }
            },
            bottomBar = {
                AnimatedVisibility(
                    visible = isTopLevel,
                    enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
                    exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
                ) {
                    NavigationBar {
                        TopLevelRoute.entries.forEach { route ->
                            val selected = currentRoute == route.route
                            NavigationBarItem(
                                selected = selected,
                                onClick = {
                                    navController.navigate(route.route) {
                                        popUpTo(navController.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                },
                                icon = {
                                    Icon(
                                        imageVector =
                                            if (selected) {
                                                route.selectedIcon
                                            } else {
                                                route.unselectedIcon
                                            },
                                        contentDescription = route.label,
                                    )
                                },
                                label = { Text(route.label) },
                            )
                        }
                    }
                }
            },
        ) { innerPadding ->
            MainNavGraph(
                navController = navController,
                innerPadding = innerPadding,
                sharedScope = sharedScope,
                transactionsViewModel = transactionsViewModel,
                quickUploadItems = quickUploadItems,
                photoPickerLauncher = photoPickerLauncher,
                onQuickUploadItemClick = { item ->
                    val route = if (item.proposalType == "transaction_group") {
                        "createTransactionGroup?quickUploadId=${item.id}"
                    } else {
                        "createTransaction/regular_transaction?quickUploadId=${item.id}"
                    }
                    navController.navigate(route)
                },
                onQuickUploadRetry = { quickUploadViewModel.retry(it) },
                onQuickUploadDismiss = { quickUploadViewModel.dismiss(it) },
                onRefreshQuickUploads = { quickUploadViewModel.refresh() },
                onProposalCompleted = { quickUploadViewModel.onProposalCompleted(it) },
                transactionCache = transactionCache,
                pendingGroupTransaction = pendingGroupTransaction,
                editingGroupIndex = editingGroupIndex,
                onNavigateToDetail = ::navigateToDetail,
            )
        }
    }
}

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
@Suppress(
    "LongMethod",
    "CyclomaticComplexMethod",
    "MutableParams",
    "MutableStateParam",
    "ViewModelForwarding",
)
private fun MainNavGraph(
    navController: NavHostController,
    innerPadding: PaddingValues,
    sharedScope: SharedTransitionScope,
    transactionsViewModel: TransactionsViewModel,
    quickUploadItems: List<QuickUploadUiItem>,
    photoPickerLauncher: androidx.activity.result.ActivityResultLauncher<PickVisualMediaRequest>,
    onQuickUploadItemClick: (QuickUploadUiItem) -> Unit,
    onQuickUploadRetry: (String) -> Unit,
    onQuickUploadDismiss: (String) -> Unit,
    onRefreshQuickUploads: () -> Unit,
    onProposalCompleted: (String) -> Unit,
    transactionCache: MutableMap<String, TransactionDetailState>,
    pendingGroupTransaction: MutableState<GroupTransactionItem?>,
    editingGroupIndex: MutableState<Int?>,
    onNavigateToDetail: (TransactionListItem, Boolean) -> Unit,
) {
    NavHost(
        navController = navController,
        startDestination = TopLevelRoute.Portfolio.route,
        enterTransition = { fadeIn(animationSpec = tween(300)) },
        exitTransition = { fadeOut(animationSpec = tween(300)) },
        modifier = Modifier.fillMaxSize(),
    ) {
        composable(TopLevelRoute.Portfolio.route) {
            PortfolioScreen(
                modifier =
                    Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                        .consumeWindowInsets(innerPadding),
            )
        }
        composable(TopLevelRoute.Transactions.route) {
            @Suppress("ViewModelForwarding")
            TransactionsScreen(
                modifier =
                    Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                        .consumeWindowInsets(innerPadding),
                onTransactionClick = { onNavigateToDetail(it, false) },
                onCreateTransaction = { typeKey ->
                    navController.navigate("createTransaction/$typeKey")
                },
                onCreateGroup = {
                    navController.navigate("createTransactionGroup")
                },
                onQuickUpload = {
                    photoPickerLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                },
                quickUploadItems = quickUploadItems,
                onQuickUploadItemClick = onQuickUploadItemClick,
                onQuickUploadRetry = onQuickUploadRetry,
                onQuickUploadDismiss = onQuickUploadDismiss,
                onRefreshQuickUploads = onRefreshQuickUploads,
                sharedTransitionScope = sharedScope,
                animatedVisibilityScope = this@composable,
                viewModel = transactionsViewModel,
            )
        }
        composable(TopLevelRoute.Accounts.route) {
            AccountsScreen(
                modifier =
                    Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                        .consumeWindowInsets(innerPadding),
            )
        }
        composable(
            route = TRANSACTION_DETAIL_ROUTE,
            arguments = listOf(navArgument("txId") { type = NavType.StringType }),
        ) { backStackEntry ->
            val txId = backStackEntry.arguments?.getString("txId")
            val detailState = txId?.let { transactionCache[it] }
            if (detailState != null) {
                TransactionDetailScreen(
                    transaction = detailState.transaction,
                    isInGroup = detailState.isInGroup,
                    onBack = { navController.popBackStack() },
                    onEdit = {
                        if (detailState.transaction.isGroup) {
                            navController.navigate(
                                "editTransactionGroup/${detailState.transaction.id}",
                            )
                        } else {
                            val configKey =
                                apiTypeToConfigKey(detailState.transaction.transactionType)
                            navController.navigate(
                                "editTransaction/$configKey/${detailState.transaction.id}",
                            )
                        }
                    },
                    onDelete = {
                        val deletedId = detailState.transaction.id
                        if (detailState.transaction.isGroup) {
                            transactionsViewModel.deleteTransactionGroup(deletedId) {
                                transactionCache.remove(deletedId)
                            }
                        } else {
                            transactionsViewModel.deleteTransaction(deletedId) {
                                transactionCache.remove(deletedId)
                            }
                        }
                        navController.popBackStack()
                    },
                    onChildClick = { child -> onNavigateToDetail(child, true) },
                    sharedTransitionScope = sharedScope,
                    animatedVisibilityScope = this@composable,
                )
            }
        }
        composable(
            route = "createTransaction/{typeKey}?quickUploadId={quickUploadId}",
            arguments = listOf(
                navArgument("typeKey") { type = NavType.StringType },
                navArgument("quickUploadId") { type = NavType.StringType; nullable = true; defaultValue = null },
            ),
        ) { backStackEntry ->
            val typeKey = backStackEntry.arguments?.getString("typeKey") ?: return@composable
            val quickUploadId = backStackEntry.arguments?.getString("quickUploadId")
            CreateTransactionScreen(
                typeKey = typeKey,
                quickUploadId = quickUploadId,
                onDiscard = { navController.popBackStack() },
                onSuccess = { _ ->
                    transactionsViewModel.refresh()
                    if (quickUploadId != null) {
                        onProposalCompleted(quickUploadId)
                    }
                    navController.popBackStack()
                },
                onCorrectionTypeChanged = { change ->
                    navController.popBackStack()
                    val route = if (change.newProposalType == "transaction_group") {
                        "createTransactionGroup?quickUploadId=${change.quickUploadId}"
                    } else {
                        "createTransaction/${change.newProposalType}?quickUploadId=${change.quickUploadId}"
                    }
                    navController.navigate(route)
                },
            )
        }
        composable(
            route = EDIT_TRANSACTION_ROUTE,
            arguments =
                listOf(
                    navArgument("typeKey") { type = NavType.StringType },
                    navArgument("txId") { type = NavType.StringType },
                ),
        ) { backStackEntry ->
            val typeKey = backStackEntry.arguments?.getString("typeKey") ?: return@composable
            val txId = backStackEntry.arguments?.getString("txId") ?: return@composable
            CreateTransactionScreen(
                typeKey = typeKey,
                editTransactionId = txId,
                onDiscard = { navController.popBackStack() },
                onSuccess = { updatedTransaction ->
                    updatedTransaction?.let { updated ->
                        val existingState = transactionCache[txId]
                        transactionCache[txId] =
                            TransactionDetailState(
                                transaction = updated,
                                isInGroup = existingState?.isInGroup ?: false,
                            )
                    }
                    transactionsViewModel.refresh()
                    navController.popBackStack()
                },
            )
        }
        composable(
            route = "createTransactionGroup?quickUploadId={quickUploadId}",
            arguments = listOf(
                navArgument("quickUploadId") { type = NavType.StringType; nullable = true; defaultValue = null },
            ),
        ) { backStackEntry ->
            val quickUploadId = backStackEntry.arguments?.getString("quickUploadId")
            val pending = pendingGroupTransaction.value
            val vm: CreateTransactionGroupViewModel = viewModel(factory = SvertoViewModelFactory)

            LaunchedEffect(quickUploadId) {
                if (quickUploadId != null) {
                    vm.initFromProposal(quickUploadId)
                }
            }

            LaunchedEffect(pending) {
                if (pending != null) {
                    val idx = editingGroupIndex.value
                    if (idx != null) {
                        vm.updateTransaction(idx, pending)
                        editingGroupIndex.value = null
                    } else {
                        vm.addTransaction(pending)
                    }
                    pendingGroupTransaction.value = null
                }
            }

            CreateTransactionGroupScreen(
                quickUploadId = quickUploadId,
                onDiscard = { navController.popBackStack() },
                onSuccess = {
                    transactionsViewModel.refresh()
                    if (quickUploadId != null) {
                        onProposalCompleted(quickUploadId)
                    }
                    navController.popBackStack()
                },
                onAddTransaction = { typeKey ->
                    navController.navigate("groupAddTransaction/$typeKey")
                },
                onEditTransaction = { index, typeKey ->
                    editingGroupIndex.value = index
                    navController.navigate("groupEditTransaction/$typeKey/$index")
                },
                onCorrectionTypeChanged = { change ->
                    navController.popBackStack()
                    val route = if (change.newProposalType == "transaction_group") {
                        "createTransactionGroup?quickUploadId=${change.quickUploadId}"
                    } else {
                        "createTransaction/regular_transaction?quickUploadId=${change.quickUploadId}"
                    }
                    navController.navigate(route)
                },
                viewModel = vm,
            )
        }
        composable(
            route = EDIT_GROUP_ROUTE,
            arguments = listOf(navArgument("groupId") { type = NavType.StringType }),
        ) { backStackEntry ->
            val groupId = backStackEntry.arguments?.getString("groupId") ?: return@composable
            val group = transactionCache[groupId]?.transaction
            val pending = pendingGroupTransaction.value
            val vm: CreateTransactionGroupViewModel = viewModel(factory = SvertoViewModelFactory)

            LaunchedEffect(pending) {
                if (pending != null) {
                    val idx = editingGroupIndex.value
                    if (idx != null) {
                        vm.updateTransaction(idx, pending)
                        editingGroupIndex.value = null
                    } else {
                        vm.addTransaction(pending)
                    }
                    pendingGroupTransaction.value = null
                }
            }

            CreateTransactionGroupScreen(
                editGroupId = groupId,
                editGroup = group,
                onDiscard = { navController.popBackStack() },
                onSuccess = {
                    transactionCache.remove(groupId)
                    transactionsViewModel.refresh()
                    navController.popBackStack()
                },
                onAddTransaction = { typeKey ->
                    navController.navigate("groupAddTransaction/$typeKey")
                },
                onEditTransaction = { index, typeKey ->
                    editingGroupIndex.value = index
                    navController.navigate("groupEditTransaction/$typeKey/$index")
                },
                viewModel = vm,
            )
        }
        composable(
            route = GROUP_ADD_TXN_ROUTE,
            arguments = listOf(navArgument("typeKey") { type = NavType.StringType }),
        ) { backStackEntry ->
            val typeKey = backStackEntry.arguments?.getString("typeKey") ?: return@composable
            CreateTransactionScreen(
                typeKey = typeKey,
                isGroupMode = true,
                onDiscard = { navController.popBackStack() },
                onSuccess = { navController.popBackStack() },
                onGroupTransactionReady = { item ->
                    pendingGroupTransaction.value = item
                },
            )
        }
        composable(
            route = GROUP_EDIT_TXN_ROUTE,
            arguments =
                listOf(
                    navArgument("typeKey") { type = NavType.StringType },
                    navArgument("index") { type = NavType.IntType },
                ),
        ) { backStackEntry ->
            val typeKey = backStackEntry.arguments?.getString("typeKey") ?: return@composable
            val index = backStackEntry.arguments?.getInt("index") ?: return@composable

            val parentEntry = remember(backStackEntry) { navController.previousBackStackEntry }
            val groupVm: CreateTransactionGroupViewModel? = parentEntry?.let {
                viewModel(it, factory = SvertoViewModelFactory)
            }
            val item = remember { groupVm?.formState?.value?.transactions?.getOrNull(index) }

            if (item != null) {
                val vm: CreateTransactionViewModel = viewModel(factory = SvertoViewModelFactory)
                vm.initForGroupEdit(
                    item.input,
                    GroupEditDisplayData(
                        categoryName = item.categoryName,
                        primaryAccountName = item.accountName,
                        primaryAssetDisplay = item.assetDisplay,
                    ),
                )

                CreateTransactionScreen(
                    typeKey = typeKey,
                    isGroupMode = true,
                    editTransactionId = item.input.transactionId,
                    onDiscard = { navController.popBackStack() },
                    onSuccess = { navController.popBackStack() },
                    viewModel = vm,
                    onGroupTransactionReady = { pendingGroupTransaction.value = it },
                )
            } else {
                LaunchedEffect(Unit) { navController.popBackStack() }
            }
        }
    }
}
