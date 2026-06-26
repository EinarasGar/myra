package com.sverto.app

import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionLayout
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.Scaffold
import androidx.compose.material3.ShortNavigationBar
import androidx.compose.material3.ShortNavigationBarItem
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.IntOffset
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
import com.sverto.app.core.SvertoViewModelFactory
import com.sverto.app.core.components.ProfileAvatarButton
import com.sverto.app.core.navigation.TopLevelRoute
import com.sverto.app.core.ui.OfflineBanner
import com.sverto.app.feature.accounts.AccountDetailScreen
import com.sverto.app.feature.accounts.AccountTransactionsScreen
import com.sverto.app.feature.accounts.AccountsScreen
import com.sverto.app.feature.accounts.AddAccountScreen
import com.sverto.app.feature.accounts.AssetDetailScreen
import com.sverto.app.feature.aichat.AiChatScreen
import com.sverto.app.feature.aichat.AiChatViewModel
import com.sverto.app.feature.aichat.ConversationDrawer
import com.sverto.app.feature.assets.AssetSearchAppBar
import com.sverto.app.feature.assets.CustomAssetsScreen
import com.sverto.app.feature.categories.CustomCategoriesScreen
import com.sverto.app.feature.portfolio.PortfolioScreen
import com.sverto.app.feature.settings.SettingsScreen
import com.sverto.app.feature.transactions.TransactionDetailScreen
import com.sverto.app.feature.transactions.TransactionsScreen
import com.sverto.app.feature.transactions.TransactionsViewModel
import com.sverto.app.feature.transactions.create.CreateTransactionScreen
import com.sverto.app.feature.transactions.create.CreateTransactionViewModel
import com.sverto.app.feature.transactions.create.GroupEditDisplayData
import com.sverto.app.feature.transactions.create.apiTypeToConfigKey
import com.sverto.app.feature.transactions.group.CreateTransactionGroupScreen
import com.sverto.app.feature.transactions.group.CreateTransactionGroupViewModel
import com.sverto.app.feature.transactions.group.GroupTransactionItem
import com.sverto.app.feature.transactions.quickupload.QuickUploadUiItem
import com.sverto.app.feature.transactions.quickupload.QuickUploadViewModel
import com.sverto.app.feature.transactions.quickupload.prepareQuickUpload
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import uniffi.sverto_core.ConnectionStatus
import uniffi.sverto_core.TransactionListItem
import com.sverto.app.feature.assets.AssetDetailScreen as MarketAssetDetailScreen

private const val TRANSACTION_DETAIL_ROUTE = "transactionDetail/{txId}"
private const val EDIT_TRANSACTION_ROUTE = "editTransaction/{typeKey}/{txId}"
private const val EDIT_GROUP_ROUTE = "editTransactionGroup/{groupId}"
private const val GROUP_ADD_TXN_ROUTE = "groupAddTransaction/{typeKey}"
private const val GROUP_EDIT_TXN_ROUTE = "groupEditTransaction/{typeKey}/{index}"
private const val ACCOUNT_DETAIL_ROUTE = "accountDetail/{accountId}/{accountName}/{accountTypeId}"
private const val ASSET_DETAIL_ROUTE = "assetDetail/{accountId}/{assetId}"
private const val ACCOUNT_TRANSACTIONS_ROUTE = "accountTransactions/{accountId}"
private const val ADD_ACCOUNT_ROUTE = "addAccount"
private const val EDIT_ACCOUNT_ROUTE = "editAccount/{accountId}"
private const val MARKET_ASSET_DETAIL_ROUTE = "asset/{assetId}?userAsset={userAsset}"
private const val CUSTOM_ASSETS_ROUTE = "customAssets"

private data class TransactionDetailState(
    val transaction: TransactionListItem,
    val isInGroup: Boolean,
)

@Suppress("LongMethod", "ModifierMissing", "ViewModelForwarding")
@OptIn(
    ExperimentalMaterial3Api::class,
    ExperimentalMaterial3ExpressiveApi::class,
    ExperimentalSharedTransitionApi::class,
)
@Composable
fun MainScreen(
    sharedImageUris: List<Uri> = emptyList(),
    onSharedImagesHandled: () -> Unit = {},
    transactionsViewModel: TransactionsViewModel = viewModel(factory = SvertoViewModelFactory),
    quickUploadViewModel: QuickUploadViewModel = viewModel(factory = SvertoViewModelFactory),
    aiChatViewModel: AiChatViewModel = viewModel(factory = SvertoViewModelFactory),
) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val isTopLevel = TopLevelRoute.entries.any { it.route == currentRoute }
    val isAiChatTab = currentRoute == TopLevelRoute.AiChat.route
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val aiChatState by aiChatViewModel.uiState.collectAsStateWithLifecycle()

    val transactionCache = remember { mutableMapOf<String, TransactionDetailState>() }
    val pendingGroupTransaction = remember { mutableStateOf<GroupTransactionItem?>(null) }
    val editingGroupIndex = remember { mutableStateOf<Int?>(null) }

    val quickUploadItems by quickUploadViewModel.items.collectAsStateWithLifecycle()

    val context = LocalContext.current
    val appStore = remember { (context.applicationContext as SvertoApp).appStore }

    suspend fun prepareAndQueue(uri: Uri) {
        val prepared = withContext(Dispatchers.IO) { prepareQuickUpload(context, uri) }
        if (prepared != null) {
            quickUploadViewModel.queueUpload(prepared.imageBytes, prepared.thumbnailBytes, prepared.mimeType)
        } else {
            Toast.makeText(context, "Couldn't add that image", Toast.LENGTH_SHORT).show()
        }
    }

    val photoPickerLauncher =
        rememberLauncherForActivityResult(
            contract = ActivityResultContracts.PickVisualMedia(),
        ) { uri ->
            if (uri != null) scope.launch { prepareAndQueue(uri) }
        }

    LaunchedEffect(sharedImageUris) {
        if (sharedImageUris.isNotEmpty()) {
            val uris = sharedImageUris
            onSharedImagesHandled()
            navController.navigate(TopLevelRoute.Transactions.route) {
                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                launchSingleTop = true
                restoreState = true
            }
            scope.launch { uris.forEach { prepareAndQueue(it) } }
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
        val observer =
            object : uniffi.sverto_core.ConnectionObserver {
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

        ModalNavigationDrawer(
            drawerState = drawerState,
            // Only interactive on the AI Chat tab: enables scrim tap-to-close and edge-swipe
            // there, while keeping the drawer inert (and unreachable) on the other tabs.
            gesturesEnabled = isAiChatTab,
            drawerContent = {
                // Always compose the drawer so its width stays constant (304.dp). If the
                // content collapsed to zero width on non-chat tabs, ModalNavigationDrawer
                // would recompute its anchors when the chat content appears and spring open.
                // The drawer is only reachable from the AI Chat tab (see the hamburger below).
                ConversationDrawer(
                    conversations = aiChatState.conversations,
                    activeConversationId = aiChatState.activeConversationId,
                    onSelect = { id ->
                        aiChatViewModel.selectConversation(id)
                        scope.launch { drawerState.close() }
                    },
                    onCreate = {
                        aiChatViewModel.startNewConversation()
                        scope.launch { drawerState.close() }
                    },
                    onDelete = { id ->
                        aiChatViewModel.deleteConversation(id)
                    },
                )
            },
        ) {
            Scaffold(
                modifier = Modifier.fillMaxSize(),
                containerColor = MaterialTheme.colorScheme.surfaceContainer,
                topBar = {
                    Column {
                        AnimatedVisibility(
                            visible = isTopLevel,
                            enter = slideInVertically(initialOffsetY = { -it }) + fadeIn(),
                            exit = slideOutVertically(targetOffsetY = { -it }) + fadeOut(),
                        ) {
                            CenterAlignedTopAppBar(
                                navigationIcon = {
                                    if (isAiChatTab) {
                                        IconButton(onClick = { scope.launch { drawerState.open() } }) {
                                            Icon(Icons.Default.Menu, contentDescription = "Menu")
                                        }
                                    } else if (currentRoute == TopLevelRoute.Portfolio.route) {
                                        // Decorative logo sized like an IconButton so the
                                        // app-bar layout matches the other tabs, without a
                                        // ripple-emitting dead button.
                                        Box(
                                            modifier = Modifier.size(48.dp),
                                            contentAlignment = Alignment.Center,
                                        ) {
                                            Icon(
                                                painter = painterResource(id = R.drawable.ic_sverto_logo),
                                                contentDescription = "Sverto",
                                                tint = MaterialTheme.colorScheme.primary,
                                                modifier = Modifier.height(24.dp),
                                            )
                                        }
                                    }
                                },
                                title = {
                                    if (currentRoute == TopLevelRoute.Portfolio.route) {
                                        AssetSearchAppBar(
                                            onAssetClick = { id ->
                                                navController.navigate("asset/$id?userAsset=false")
                                            },
                                        )
                                    } else {
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
                                    }
                                },
                                actions = {
                                    ProfileAvatarButton(
                                        onClick = { navController.navigate("settings") },
                                    )
                                },
                                colors =
                                    TopAppBarDefaults.topAppBarColors(
                                        containerColor = MaterialTheme.colorScheme.surfaceContainer,
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
                        ShortNavigationBar {
                            TopLevelRoute.entries.forEach { route ->
                                val selected = currentRoute == route.route
                                ShortNavigationBarItem(
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
                        val route =
                            if (item.proposalType == "transaction_group") {
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
                    aiChatViewModel = aiChatViewModel,
                    onEdit = { id -> navController.navigate("editAccount/$id") },
                )
            }
        }
    } // ModalNavigationDrawer
}

@OptIn(ExperimentalMaterial3ExpressiveApi::class, ExperimentalSharedTransitionApi::class)
@Composable
@Suppress(
    "LongMethod",
    "CyclomaticComplexMethod",
    "MutableParams",
    "MutableStateParam",
    "ViewModelForwarding",
    "ParameterNaming",
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
    aiChatViewModel: AiChatViewModel,
    onEdit: (String) -> Unit,
) {
    val fadeSpec = MaterialTheme.motionScheme.defaultEffectsSpec<Float>()
    val slideSpec = MaterialTheme.motionScheme.defaultSpatialSpec<IntOffset>()
    NavHost(
        navController = navController,
        startDestination = TopLevelRoute.Portfolio.route,
        enterTransition = { fadeIn(animationSpec = fadeSpec) },
        exitTransition = { fadeOut(animationSpec = fadeSpec) },
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
                onAccountClick = { account ->
                    navController.navigate("accountDetail/${account.id}/${account.name}/${account.accountTypeId}")
                },
                onAddAccount = { navController.navigate(ADD_ACCOUNT_ROUTE) },
                sharedTransitionScope = sharedScope,
                animatedVisibilityScope = this@composable,
                modifier =
                    Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                        .consumeWindowInsets(innerPadding),
            )
        }
        composable(TopLevelRoute.AiChat.route) {
            AiChatScreen(
                viewModel = aiChatViewModel,
                modifier =
                    Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                        .consumeWindowInsets(innerPadding),
            )
        }
        composable(ADD_ACCOUNT_ROUTE) {
            AddAccountScreen(
                onBack = { navController.popBackStack() },
                onSuccess = { navController.popBackStack() },
            )
        }
        composable(
            route = EDIT_ACCOUNT_ROUTE,
            arguments = listOf(navArgument("accountId") { type = NavType.StringType }),
        ) { backStackEntry ->
            val accountId =
                backStackEntry.arguments?.getString("accountId") ?: return@composable
            AddAccountScreen(
                onBack = { navController.popBackStack() },
                onSuccess = { navController.popBackStack() },
                accountId = accountId,
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
            arguments =
                listOf(
                    navArgument("typeKey") { type = NavType.StringType },
                    navArgument("quickUploadId") {
                        type = NavType.StringType
                        nullable = true
                        defaultValue = null
                    },
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
                    val route =
                        if (change.newProposalType == "transaction_group") {
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
            arguments =
                listOf(
                    navArgument("quickUploadId") {
                        type = NavType.StringType
                        nullable = true
                        defaultValue = null
                    },
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
                    val route =
                        if (change.newProposalType == "transaction_group") {
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
            val groupVm: CreateTransactionGroupViewModel? =
                parentEntry?.let {
                    viewModel(it, factory = SvertoViewModelFactory)
                }
            val item =
                remember {
                    groupVm
                        ?.formState
                        ?.value
                        ?.transactions
                        ?.getOrNull(index)
                }

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
        composable(
            route = ACCOUNT_DETAIL_ROUTE,
            arguments =
                listOf(
                    navArgument("accountId") { type = NavType.StringType },
                    navArgument("accountName") { type = NavType.StringType },
                    navArgument("accountTypeId") { type = NavType.IntType },
                ),
        ) { backStackEntry ->
            val accountId = backStackEntry.arguments?.getString("accountId") ?: return@composable
            val accountName = backStackEntry.arguments?.getString("accountName") ?: return@composable
            val accountTypeId = backStackEntry.arguments?.getInt("accountTypeId") ?: return@composable
            AccountDetailScreen(
                accountId = accountId,
                accountName = accountName,
                accountTypeId = accountTypeId,
                onBack = { navController.popBackStack() },
                onHoldingClick = { _, assetId ->
                    navController.navigate("assetDetail/$accountId/$assetId")
                },
                onViewAllTransactions = {
                    navController.navigate("accountTransactions/$accountId")
                },
                onTransactionClick = { tx -> onNavigateToDetail(tx, false) },
                onEdit = onEdit,
                sharedTransitionScope = sharedScope,
                animatedVisibilityScope = this@composable,
                modifier = Modifier.fillMaxSize(),
            )
        }
        composable(
            route = ASSET_DETAIL_ROUTE,
            arguments =
                listOf(
                    navArgument("accountId") { type = NavType.StringType },
                    navArgument("assetId") { type = NavType.IntType },
                ),
        ) { backStackEntry ->
            val accountId = backStackEntry.arguments?.getString("accountId") ?: return@composable
            val assetId = backStackEntry.arguments?.getInt("assetId") ?: return@composable
            AssetDetailScreen(
                accountId = accountId,
                assetId = assetId,
                onBack = { navController.popBackStack() },
                modifier = Modifier.fillMaxSize(),
            )
        }
        composable(
            route = ACCOUNT_TRANSACTIONS_ROUTE,
            arguments = listOf(navArgument("accountId") { type = NavType.StringType }),
        ) { backStackEntry ->
            val accountId = backStackEntry.arguments?.getString("accountId") ?: return@composable
            AccountTransactionsScreen(
                accountId = accountId,
                onBack = { navController.popBackStack() },
                onTransactionClick = { tx -> onNavigateToDetail(tx, false) },
                sharedTransitionScope = sharedScope,
                animatedVisibilityScope = this@composable,
                modifier = Modifier.fillMaxSize(),
            )
        }
        composable(
            route = "settings",
            enterTransition = {
                slideIntoContainer(
                    AnimatedContentTransitionScope.SlideDirection.Start,
                    animationSpec = slideSpec,
                )
            },
            exitTransition = {
                slideOutOfContainer(
                    AnimatedContentTransitionScope.SlideDirection.Start,
                    animationSpec = slideSpec,
                )
            },
            popEnterTransition = {
                slideIntoContainer(
                    AnimatedContentTransitionScope.SlideDirection.End,
                    animationSpec = slideSpec,
                )
            },
            popExitTransition = {
                slideOutOfContainer(
                    AnimatedContentTransitionScope.SlideDirection.End,
                    animationSpec = slideSpec,
                )
            },
        ) {
            SettingsScreen(
                onBack = { navController.popBackStack() },
                onCustomCategories = { navController.navigate("customCategories") },
                onCustomAssets = { navController.navigate("customAssets") },
            )
        }
        composable(
            route = "customCategories",
            enterTransition = {
                slideIntoContainer(
                    AnimatedContentTransitionScope.SlideDirection.Start,
                    animationSpec = slideSpec,
                )
            },
            exitTransition = {
                slideOutOfContainer(
                    AnimatedContentTransitionScope.SlideDirection.Start,
                    animationSpec = slideSpec,
                )
            },
            popEnterTransition = {
                slideIntoContainer(
                    AnimatedContentTransitionScope.SlideDirection.End,
                    animationSpec = slideSpec,
                )
            },
            popExitTransition = {
                slideOutOfContainer(
                    AnimatedContentTransitionScope.SlideDirection.End,
                    animationSpec = slideSpec,
                )
            },
        ) {
            CustomCategoriesScreen(onBack = { navController.popBackStack() })
        }
        composable(
            route = MARKET_ASSET_DETAIL_ROUTE,
            arguments =
                listOf(
                    navArgument("assetId") { type = NavType.IntType },
                    navArgument("userAsset") {
                        type = NavType.BoolType
                        defaultValue = false
                    },
                ),
        ) { backStackEntry ->
            val assetId = backStackEntry.arguments?.getInt("assetId") ?: return@composable
            val userAsset = backStackEntry.arguments?.getBoolean("userAsset") ?: false
            MarketAssetDetailScreen(
                assetId = assetId,
                userAsset = userAsset,
                onBack = { navController.popBackStack() },
            )
        }
        composable(CUSTOM_ASSETS_ROUTE) {
            CustomAssetsScreen(
                onBack = { navController.popBackStack() },
                onAssetClick = { assetId -> navController.navigate("asset/$assetId?userAsset=true") },
            )
        }
    }
}
