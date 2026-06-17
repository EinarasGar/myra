package com.sverto.app.feature.onboarding

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.LoadingIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sverto.app.core.SvertoViewModelFactory
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class, ExperimentalFoundationApi::class)
@Composable
fun OnboardingScreen(
    onComplete: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: OnboardingViewModel = viewModel(factory = SvertoViewModelFactory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val currentOnComplete by rememberUpdatedState(onComplete)

    if (state.steps.isEmpty()) {
        LaunchedEffect(Unit) { currentOnComplete() }
        return
    }

    val pagerState = rememberPagerState(pageCount = { state.steps.size })
    val scope = rememberCoroutineScope()

    LaunchedEffect(state.finished) {
        if (state.finished) currentOnComplete()
    }

    Box(modifier = modifier.fillMaxSize()) {
        Scaffold(
            modifier = Modifier.fillMaxSize(),
            containerColor = MaterialTheme.colorScheme.surface,
        ) { padding ->
            Column(
                modifier =
                    Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .statusBarsPadding(),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Spacer(Modifier.height(24.dp))
                PageIndicator(
                    pageCount = state.steps.size,
                    currentPage = pagerState.currentPage,
                )
                Spacer(Modifier.height(8.dp))

                HorizontalPager(
                    state = pagerState,
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.Top,
                ) { page ->
                    when (state.steps[page]) {
                        OnboardingStepId.WELCOME -> WelcomePage()
                        OnboardingStepId.BASE_CURRENCY ->
                            BaseCurrencyPage(
                                query = state.query,
                                results = state.currencyResults,
                                selectedCurrency = state.selectedCurrency,
                                isLoading = state.isLoadingCurrencies,
                                onQueryChange = viewModel::onQueryChange,
                                onCurrencySelect = viewModel::selectCurrency,
                            )
                        OnboardingStepId.NOTIFICATIONS -> NotificationsPage()
                    }
                }

                OnboardingNavBar(
                    isFirstPage = pagerState.currentPage == 0,
                    isLastPage = pagerState.currentPage == state.steps.size - 1,
                    forwardEnabled =
                        state.steps[pagerState.currentPage] != OnboardingStepId.BASE_CURRENCY ||
                            state.selectedCurrency != null,
                    onBack = {
                        scope.launch {
                            pagerState.animateScrollToPage(pagerState.currentPage - 1)
                        }
                    },
                    onNext = {
                        if (state.steps[pagerState.currentPage] == OnboardingStepId.BASE_CURRENCY) {
                            viewModel.saveBaseAsset()
                        }
                        scope.launch {
                            pagerState.animateScrollToPage(pagerState.currentPage + 1)
                        }
                    },
                    onFinish = viewModel::finish,
                )
            }
        }

        if (state.isFinishing) {
            Box(
                modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.scrim.copy(alpha = 0.32f)),
                contentAlignment = Alignment.Center,
            ) {
                LoadingIndicator()
            }
        }

        state.error?.let { error ->
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.BottomCenter,
            ) {
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(16.dp),
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun PageIndicator(
    pageCount: Int,
    currentPage: Int,
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        repeat(pageCount) { index ->
            val active = index == currentPage
            val width by animateDpAsState(
                targetValue = if (active) 24.dp else 8.dp,
                animationSpec = MaterialTheme.motionScheme.defaultSpatialSpec(),
                label = "indicatorWidth",
            )
            Box(
                modifier =
                    Modifier
                        .height(8.dp)
                        .width(width)
                        .clip(CircleShape)
                        .background(
                            if (active) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.outlineVariant
                            },
                        ),
            )
            if (index < pageCount - 1) Spacer(Modifier.size(6.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun OnboardingNavBar(
    isFirstPage: Boolean,
    isLastPage: Boolean,
    forwardEnabled: Boolean,
    onBack: () -> Unit,
    onNext: () -> Unit,
    onFinish: () -> Unit,
) {
    Row(
        modifier =
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(top = 12.dp, bottom = 32.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (!isFirstPage) {
            TextButton(onClick = onBack) {
                Text("Back")
            }
        }
        Button(
            onClick = if (isLastPage) onFinish else onNext,
            enabled = forwardEnabled,
            modifier = Modifier.weight(1f).height(56.dp),
            shapes = ButtonDefaults.shapes(shape = MaterialTheme.shapes.extraLarge),
        ) {
            Text(if (isLastPage) "Get started" else "Next")
        }
    }
}
