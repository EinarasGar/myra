package com.sverto.app.feature.server

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.clerk.api.Clerk
import com.clerk.api.auth.AuthEvent
import com.sverto.app.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import uniffi.sverto_core.ApiException
import uniffi.sverto_core.AuthMode
import uniffi.sverto_core.AuthObserver
import uniffi.sverto_core.ServerInfo

sealed interface SessionState {
    data object Loading : SessionState

    data object Welcome : SessionState

    data class ServerUrl(
        val lastUrl: String?,
        val connectionStatus: ServerConnectionStatus = ServerConnectionStatus.Idle,
    ) : SessionState

    data object Connecting : SessionState

    data class ConnectError(
        val message: String,
    ) : SessionState

    data class SignIn(
        val isSubmitting: Boolean = false,
        val errorMessage: String? = null,
    ) : SessionState

    data object SignUp : SessionState

    data object ClerkLogin : SessionState

    data object SignedIn : SessionState
}

class AppSessionViewModel(
    app: Application,
) : AndroidViewModel(app) {
    private val appStore = (app as com.sverto.app.SvertoApp).appStore
    private val serverPrefs = ServerPreferences(app)

    private val _state = MutableStateFlow<SessionState>(SessionState.Loading)
    val state: StateFlow<SessionState> = _state.asStateFlow()

    private val _serverInfo = MutableStateFlow<ServerInfo?>(null)
    val serverInfo: StateFlow<ServerInfo?> = _serverInfo.asStateFlow()

    private val _activeServerUrl = MutableStateFlow<String?>(null)
    val activeServerUrl: StateFlow<String?> = _activeServerUrl.asStateFlow()

    private val _serverOrigin = MutableStateFlow<ServerOrigin?>(null)
    val serverOrigin: StateFlow<ServerOrigin?> = _serverOrigin.asStateFlow()

    private val authObserver =
        object : AuthObserver {
            override fun onSessionExpired() {
                viewModelScope.launch {
                    appStore.signOut()
                    if (isClerkMode()) {
                        _state.value = SessionState.ClerkLogin
                    } else {
                        _state.value = SessionState.SignIn()
                    }
                }
            }
        }

    init {
        appStore.observeAuth(authObserver)
        viewModelScope.launch {
            Clerk.auth.events.collect { event ->
                if (event is AuthEvent.SignedOut && _state.value != SessionState.Welcome) {
                    returnToWelcome()
                }
            }
        }
        viewModelScope.launch {
            if (serverPrefs.welcomeRequiredFlow.first()) {
                _state.value = SessionState.Welcome
                return@launch
            }
            val selection = serverPrefs.activeServerFlow.first()
            if (selection != null) {
                val origin = selection.origin ?: inferServerOrigin(selection.url)
                if (selection.origin == null) {
                    serverPrefs.setActiveServer(selection.url, selection.authMode, origin, selection.version)
                }
                _activeServerUrl.value = selection.url
                _serverOrigin.value = origin
                _serverInfo.value = ServerInfo(selection.authMode, selection.version ?: "")
                resumeServer(selection.url, selection.authMode)
            } else {
                val cachedMe = withContext(Dispatchers.IO) { appStore.getCachedMe() }
                if (cachedMe != null) {
                    val defaultUrl = BuildConfig.API_BASE_URL
                    val mode = inferModeFromBuildConfig()
                    serverPrefs.setActiveServer(defaultUrl, mode, ServerOrigin.HOSTED)
                    _activeServerUrl.value = defaultUrl
                    _serverOrigin.value = ServerOrigin.HOSTED
                    _serverInfo.value = ServerInfo(mode, "")
                    resumeServer(defaultUrl, mode)
                } else {
                    _state.value = SessionState.Welcome
                }
            }
        }
    }

    fun checkSelfHostedServer(url: String) {
        val cleanUrl = url.trimEnd('/')
        _state.value = SessionState.ServerUrl(cleanUrl, ServerConnectionStatus.Checking(cleanUrl))
        viewModelScope.launch {
            @Suppress("TooGenericExceptionCaught", "SwallowedException")
            try {
                val info = withContext(Dispatchers.IO) { appStore.probeServer(cleanUrl) }
                _state.value = SessionState.ServerUrl(cleanUrl, ServerConnectionStatus.Found(cleanUrl, info))
            } catch (e: Exception) {
                _state.value =
                    SessionState.ServerUrl(
                        cleanUrl,
                        ServerConnectionStatus.Error(
                            cleanUrl,
                            "We couldn't find a Sverto server at this address. Check the URL and try again.",
                        ),
                    )
            }
        }
    }

    fun continueWithHosted() {
        val hostedUrl = BuildConfig.API_BASE_URL
        _state.value = SessionState.Connecting
        viewModelScope.launch {
            @Suppress("TooGenericExceptionCaught", "SwallowedException")
            try {
                val info = withContext(Dispatchers.IO) { appStore.connectServer(hostedUrl) }
                serverPrefs.setActiveServer(hostedUrl, info.authMode, ServerOrigin.HOSTED, info.version)
                _activeServerUrl.value = hostedUrl
                _serverOrigin.value = ServerOrigin.HOSTED
                _serverInfo.value = info
                gateByMode(info.authMode)
            } catch (e: Exception) {
                _state.value =
                    SessionState.ConnectError(
                        "Couldn't reach the hosted service at $hostedUrl. Make sure it's running, then retry.",
                    )
            }
        }
    }

    fun retryHostedConnect() {
        continueWithHosted()
    }

    fun continueWithSelfHosted() {
        val serverUrlState = _state.value as? SessionState.ServerUrl ?: return
        val found = serverUrlState.connectionStatus as? ServerConnectionStatus.Found ?: return
        _state.value = SessionState.Connecting
        viewModelScope.launch {
            withContext(Dispatchers.IO) { appStore.resumeServer(found.url, found.serverInfo.authMode) }
            serverPrefs.setActiveServer(
                found.url,
                found.serverInfo.authMode,
                ServerOrigin.SELF_HOSTED,
                found.serverInfo.version,
            )
            serverPrefs.setLastSelfHostedUrl(found.url)
            _activeServerUrl.value = found.url
            _serverOrigin.value = ServerOrigin.SELF_HOSTED
            _serverInfo.value = found.serverInfo
            gateByMode(found.serverInfo.authMode)
        }
    }

    fun signIn(
        username: String,
        password: String,
    ) {
        _state.value = SessionState.SignIn(isSubmitting = true)
        viewModelScope.launch {
            @Suppress("TooGenericExceptionCaught")
            try {
                withContext(Dispatchers.IO) { appStore.signInWithPassword(username, password) }
                _state.value = SessionState.SignedIn
            } catch (e: Exception) {
                _state.value = SessionState.SignIn(errorMessage = e.signInErrorMessage())
            }
        }
    }

    fun signUp(
        username: String,
        password: String,
    ) {
        viewModelScope.launch {
            @Suppress("TooGenericExceptionCaught", "SwallowedException")
            try {
                withContext(Dispatchers.IO) { appStore.signUpWithPassword(username, password) }
                _state.value = SessionState.SignedIn
            } catch (e: Exception) {
                _state.value = SessionState.SignIn()
            }
        }
    }

    fun signOut() {
        val shouldSignOutFromClerk = isClerkMode()
        viewModelScope.launch {
            returnToWelcome()
            if (shouldSignOutFromClerk) {
                runCatching { Clerk.auth.signOut() }
            }
        }
    }

    fun onClerkSignedIn() {
        viewModelScope.launch {
            withContext(Dispatchers.IO) { appStore.onSignIn() }
            _state.value = SessionState.SignedIn
        }
    }

    fun useDifferentServer() {
        viewModelScope.launch {
            serverPrefs.clearActiveServer()
            resetServerInfo()
            _state.value = SessionState.Welcome
        }
    }

    fun resetServerInfo() {
        _activeServerUrl.value = null
        _serverOrigin.value = null
        _serverInfo.value = null
    }

    fun showSignIn() {
        _state.value = SessionState.SignIn()
    }

    fun showSignUp() {
        _state.value = SessionState.SignUp
    }

    fun showWelcome() {
        _state.value = SessionState.Welcome
    }

    fun showServerUrlInput() {
        viewModelScope.launch {
            val lastUrl = serverPrefs.lastSelfHostedUrlFlow.first()
            _state.value = SessionState.ServerUrl(lastUrl)
        }
    }

    private suspend fun resumeServer(
        url: String,
        authMode: AuthMode,
    ) {
        withContext(Dispatchers.IO) { appStore.resumeServer(url, authMode) }
        _activeServerUrl.value = url
        gateByMode(authMode)
    }

    private fun gateByMode(authMode: AuthMode) {
        when (authMode) {
            AuthMode.NOAUTH -> _state.value = SessionState.SignedIn
            AuthMode.DATABASE -> {
                if (appStore.hasSession()) {
                    _state.value = SessionState.SignedIn
                } else {
                    _state.value = SessionState.SignIn()
                }
            }
            AuthMode.CLERK -> {
                ensureClerkInitialised()
                if (Clerk.user != null) {
                    _state.value = SessionState.SignedIn
                } else {
                    _state.value = SessionState.ClerkLogin
                }
            }
        }
    }

    private fun isClerkMode(): Boolean = _serverInfo.value?.authMode == AuthMode.CLERK

    private suspend fun returnToWelcome() {
        @Suppress("TooGenericExceptionCaught", "SwallowedException")
        withContext(Dispatchers.IO) { appStore.signOut() }
        serverPrefs.clearActiveServer()
        resetServerInfo()
        _state.value = SessionState.Welcome
    }

    private fun inferServerOrigin(url: String): ServerOrigin =
        if (url.trimEnd('/') == BuildConfig.API_BASE_URL.trimEnd('/')) {
            ServerOrigin.HOSTED
        } else {
            ServerOrigin.SELF_HOSTED
        }

    private fun ensureClerkInitialised() {
        val key = BuildConfig.CLERK_PUBLISHABLE_KEY
        if (key.isNotBlank() && !Clerk.isInitialized.value) {
            Clerk.initialize(getApplication(), publishableKey = key)
        }
    }

    private fun inferModeFromBuildConfig(): AuthMode =
        if (BuildConfig.CLERK_PUBLISHABLE_KEY
                .isNotBlank()
        ) {
            AuthMode.CLERK
        } else {
            AuthMode.NOAUTH
        }

    private fun Exception.signInErrorMessage(): String =
        when (this) {
            is ApiException.Server ->
                if (status.toInt() in 401..403) {
                    "That username or password isn't correct."
                } else {
                    reason.ifBlank { "The server couldn't sign you in. Please try again." }
                }
            is ApiException.Network -> "We couldn't reach this server. Check your connection and try again."
            is ApiException.Timeout -> "The server took too long to respond. Please try again."
            is ApiException.Parse -> "The server returned an unexpected response."
            is ApiException.MissingLocalCredential -> "Your saved session is no longer available. Please sign in again."
            else -> "Something went wrong while signing in. Please try again."
        }

    override fun onCleared() {
        appStore.unobserveAuth()
    }
}
