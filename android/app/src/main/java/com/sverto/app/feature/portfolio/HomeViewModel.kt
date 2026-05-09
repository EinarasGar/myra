package com.sverto.app.feature.portfolio

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.clerk.api.Clerk
import com.clerk.api.network.serialization.ClerkResult
import com.sverto.app.BuildConfig
import com.sverto.app.core.state.UiState
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import uniffi.sverto_core.ApiClient
import uniffi.sverto_core.AuthMe
import uniffi.sverto_core.HoldingItem

data class HomeUiModel(
    val authMe: AuthMe?,
    val portfolioData: Map<TimePeriod, List<ChartPoint>>,
    val holdings: List<HoldingItem> = emptyList(),
)

class HomeViewModel(
    private val apiClient: ApiClient,
) : ViewModel() {
    private val _uiState = MutableStateFlow<UiState<HomeUiModel>>(UiState.Loading)
    val uiState: StateFlow<UiState<HomeUiModel>> = _uiState.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    init {
        load()
    }

    private suspend fun refreshAuthToken() {
        if (BuildConfig.CLERK_PUBLISHABLE_KEY.isBlank()) {
            return
        }
        when (val result = Clerk.auth.getToken()) {
            is ClerkResult.Success -> apiClient.setAuthToken(result.value)
            is ClerkResult.Failure -> Log.e("HomeViewModel", "Failed to get Clerk token: ${result.error}")
        }
    }

    fun load() {
        viewModelScope.launch(Dispatchers.IO) {
            val cached = loadFromCache()
            if (cached != null) {
                _uiState.value = UiState.Success(cached)
            } else {
                _uiState.value = UiState.Loading
            }

            try {
                refreshAuthToken()
                val authMe = apiClient.getMe()
                val portfolioData = loadPortfolioData(authMe.userId)
                val holdings = loadHoldings(authMe.userId)
                _uiState.value =
                    UiState.Success(
                        HomeUiModel(
                            authMe = authMe,
                            portfolioData = portfolioData,
                            holdings = holdings,
                        ),
                    )
            } catch (
                @Suppress("TooGenericExceptionCaught") e: Exception,
            ) {
                Log.e("HomeViewModel", "Background refresh failed", e)
                if (_uiState.value is UiState.Loading) {
                    _uiState.value = UiState.Error(e.message ?: "Unknown error")
                }
            }
        }
    }

    fun refresh() {
        val current = (_uiState.value as? UiState.Success)?.data ?: return
        _isRefreshing.value = true
        apiClient.clearCache()
        viewModelScope.launch(Dispatchers.IO) {
            try {
                refreshAuthToken()
                val portfolioData =
                    if (current.authMe != null) {
                        loadPortfolioData(current.authMe.userId)
                    } else {
                        emptyMap()
                    }
                val holdings =
                    if (current.authMe != null) {
                        loadHoldings(current.authMe.userId)
                    } else {
                        emptyList()
                    }
                _uiState.value = UiState.Success(current.copy(portfolioData = portfolioData, holdings = holdings))
            } finally {
                _isRefreshing.value = false
            }
        }
    }

    private fun loadFromCache(): HomeUiModel? {
        val authMe = apiClient.getCachedMe() ?: return null
        val portfolioData = mutableMapOf<TimePeriod, List<ChartPoint>>()
        for (period in TimePeriod.entries) {
            val history = apiClient.getCachedPortfolioHistory(authMe.userId, period.apiRange)
            portfolioData[period] = history?.sums?.map { ChartPoint(it.date, it.rate) } ?: emptyList()
        }
        val holdings = apiClient.getCachedHoldings(authMe.userId) ?: emptyList()
        return HomeUiModel(
            authMe = authMe,
            portfolioData = portfolioData,
            holdings = holdings,
        )
    }

    private suspend fun loadPortfolioData(userId: String): Map<TimePeriod, List<ChartPoint>> {
        val result = mutableMapOf<TimePeriod, List<ChartPoint>>()
        for (period in TimePeriod.entries) {
            try {
                val history = apiClient.getPortfolioHistory(userId, period.apiRange)
                result[period] = history.sums.map { ChartPoint(it.date, it.rate) }
            } catch (_: Exception) {
                result[period] = emptyList()
            }
        }
        return result
    }

    private suspend fun loadHoldings(userId: String): List<HoldingItem> =
        try {
            apiClient.getHoldings(userId)
        } catch (
            @Suppress("TooGenericExceptionCaught") e: Exception,
        ) {
            Log.e("HomeViewModel", "Failed to load holdings", e)
            emptyList()
        }
}
