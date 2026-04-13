package com.sverto.app

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionLayout
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.clerk.ui.userbutton.UserButton
import com.sverto.app.core.navigation.TopLevelRoute
import com.sverto.app.core.theme.LocalClerkTheme
import com.sverto.app.feature.accounts.AccountsScreen
import com.sverto.app.feature.portfolio.PortfolioScreen
import com.sverto.app.feature.transactions.TransactionDetailScreen
import com.sverto.app.feature.transactions.TransactionsScreen
import com.sverto.app.feature.transactions.create.CreateTransactionScreen
import uniffi.sverto_core.TransactionListItem

private const val TRANSACTION_DETAIL_ROUTE = "transactionDetail/{txId}"
private const val CREATE_TRANSACTION_ROUTE = "createTransaction/{typeKey}"

// Standard M3 component heights
private val TOP_BAR_HEIGHT = 64.dp
private val NAV_BAR_HEIGHT = 80.dp

@Suppress("LongMethod", "ModifierMissing")
@OptIn(ExperimentalMaterial3Api::class, ExperimentalSharedTransitionApi::class)
@Composable
fun MainScreen() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val isTopLevel = TopLevelRoute.entries.any { it.route == currentRoute }

    // Cache transactions by ID so each detail route instance reads its own data
    val transactionCache = remember { mutableMapOf<String, TransactionListItem>() }

    fun navigateToDetail(transaction: TransactionListItem) {
        transactionCache[transaction.id] = transaction
        navController.navigate("transactionDetail/${transaction.id}")
    }

    SharedTransitionLayout {
        val sharedScope = this

        Box(
            Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.surface),
        ) {
            NavHost(
                navController = navController,
                startDestination = TopLevelRoute.Portfolio.route,
                enterTransition = { fadeIn(animationSpec = tween(300)) },
                exitTransition = { fadeOut(animationSpec = tween(300)) },
                modifier =
                    Modifier
                        .fillMaxSize()
                        .windowInsetsPadding(WindowInsets.statusBars),
            ) {
                composable(TopLevelRoute.Portfolio.route) {
                    PortfolioScreen(modifier = Modifier.topLevelPadding())
                }
                composable(TopLevelRoute.Transactions.route) {
                    TransactionsScreen(
                        modifier = Modifier.topLevelPadding(),
                        onTransactionClick = ::navigateToDetail,
                        onCreateTransaction = { typeKey ->
                            navController.navigate("createTransaction/$typeKey")
                        },
                        sharedTransitionScope = sharedScope,
                        animatedVisibilityScope = this@composable,
                    )
                }
                composable(TopLevelRoute.Accounts.route) {
                    AccountsScreen(modifier = Modifier.topLevelPadding())
                }
                composable(
                    route = TRANSACTION_DETAIL_ROUTE,
                    arguments = listOf(navArgument("txId") { type = NavType.StringType }),
                ) { backStackEntry ->
                    val txId = backStackEntry.arguments?.getString("txId")
                    val transaction = txId?.let { transactionCache[it] }
                    if (transaction != null) {
                        TransactionDetailScreen(
                            transaction = transaction,
                            onBack = { navController.popBackStack() },
                            onChildClick = ::navigateToDetail,
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
                        onSuccess = { navController.popBackStack() },
                    )
                }
            }

            AnimatedVisibility(
                visible = isTopLevel,
                enter = slideInVertically(initialOffsetY = { -it }) + fadeIn(),
                exit = slideOutVertically(targetOffsetY = { -it }) + fadeOut(),
                modifier =
                    Modifier
                        .align(Alignment.TopStart)
                        .windowInsetsPadding(WindowInsets.statusBars),
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
                    windowInsets = WindowInsets(0),
                    colors =
                        TopAppBarDefaults.topAppBarColors(
                            containerColor = MaterialTheme.colorScheme.surface,
                        ),
                )
            }

            AnimatedVisibility(
                visible = isTopLevel,
                enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
                exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
                modifier = Modifier.align(Alignment.BottomStart),
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
                                    imageVector = if (selected) route.selectedIcon else route.unselectedIcon,
                                    contentDescription = route.label,
                                )
                            },
                            label = { Text(route.label) },
                        )
                    }
                }
            }
        }
    }
}

private fun Modifier.topLevelPadding(): Modifier = this.padding(top = TOP_BAR_HEIGHT, bottom = NAV_BAR_HEIGHT)
