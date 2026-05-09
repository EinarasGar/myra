package com.sverto.app

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionLayout
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.Column
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
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
import com.sverto.app.feature.transactions.create.CreateTransactionScreen
import com.sverto.app.feature.transactions.create.apiTypeToConfigKey
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import uniffi.sverto_core.ConnectionStatus
import uniffi.sverto_core.TransactionListItem

private const val TRANSACTION_DETAIL_ROUTE = "transactionDetail/{txId}"
private const val CREATE_TRANSACTION_ROUTE = "createTransaction/{typeKey}"
private const val EDIT_TRANSACTION_ROUTE = "editTransaction/{typeKey}/{txId}"

private data class TransactionDetailState(
    val transaction: TransactionListItem,
    val isInGroup: Boolean,
)

@Suppress("LongMethod", "ModifierMissing")
@OptIn(ExperimentalMaterial3Api::class, ExperimentalSharedTransitionApi::class)
@Composable
fun MainScreen(transactionsViewModel: TransactionsViewModel = viewModel(factory = SvertoViewModelFactory)) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val isTopLevel = TopLevelRoute.entries.any { it.route == currentRoute }

    // Cache transactions by ID so each detail route instance reads its own data
    val transactionCache = remember { mutableMapOf<String, TransactionDetailState>() }

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

    val context = LocalContext.current
    val apiClient = remember { (context.applicationContext as SvertoApp).apiClient }
    val connectionStatus = remember { mutableStateOf(ConnectionStatus.ONLINE) }

    LaunchedEffect(Unit) {
        while (isActive) {
            val newStatus = apiClient.connectionStatus()
            if (newStatus != connectionStatus.value) {
                connectionStatus.value = newStatus
            }
            delay(3_000)
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
                    // The list ViewModel is hoisted to MainScreen so edit/create/delete flows
                    // can trigger a refresh after navigating back; detekt's ViewModelForwarding
                    // rule is suppressed at the call site for that reason.
                    @Suppress("ViewModelForwarding")
                    TransactionsScreen(
                        modifier =
                            Modifier
                                .fillMaxSize()
                                .padding(innerPadding)
                                .consumeWindowInsets(innerPadding),
                        onTransactionClick = ::navigateToDetail,
                        onCreateTransaction = { typeKey ->
                            navController.navigate("createTransaction/$typeKey")
                        },
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
                                val configKey =
                                    apiTypeToConfigKey(detailState.transaction.transactionType)
                                navController.navigate(
                                    "editTransaction/$configKey/${detailState.transaction.id}",
                                )
                            },
                            onDelete = {
                                val deletedId = detailState.transaction.id
                                transactionsViewModel.deleteTransaction(deletedId) {
                                    transactionCache.remove(deletedId)
                                }
                                navController.popBackStack()
                            },
                            onChildClick = { child -> navigateToDetail(child, isInGroup = true) },
                            sharedTransitionScope = sharedScope,
                            animatedVisibilityScope = this@composable,
                        )
                    }
                }
                composable(
                    route = CREATE_TRANSACTION_ROUTE,
                    arguments = listOf(navArgument("typeKey") { type = NavType.StringType }),
                ) { backStackEntry ->
                    val typeKey = backStackEntry.arguments?.getString("typeKey") ?: return@composable
                    CreateTransactionScreen(
                        typeKey = typeKey,
                        onDiscard = { navController.popBackStack() },
                        onSuccess = { _ ->
                            transactionsViewModel.refresh()
                            navController.popBackStack()
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
            }
        }
    }
}
