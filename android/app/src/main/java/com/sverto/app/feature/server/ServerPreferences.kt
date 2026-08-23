package com.sverto.app.feature.server

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import uniffi.sverto_core.AuthMode

private val Context.serverDataStore: DataStore<Preferences> by preferencesDataStore(name = "server_preferences")

data class ServerSelection(
    val url: String,
    val authMode: AuthMode,
    val origin: ServerOrigin?,
    val version: String? = null,
)

enum class ServerOrigin { HOSTED, SELF_HOSTED }

class ServerPreferences(
    private val context: Context,
) {
    private object Keys {
        val ACTIVE_SERVER_URL = stringPreferencesKey("active_server_url")
        val ACTIVE_AUTH_MODE = stringPreferencesKey("active_auth_mode")
        val ACTIVE_SERVER_ORIGIN = stringPreferencesKey("active_server_origin")
        val ACTIVE_SERVER_VERSION = stringPreferencesKey("active_server_version")
        val LAST_SELF_HOSTED_URL = stringPreferencesKey("last_self_hosted_url")
        val WELCOME_REQUIRED = booleanPreferencesKey("welcome_required")
    }

    val activeServerFlow: Flow<ServerSelection?> =
        context.serverDataStore.data.map { prefs ->
            val url = prefs[Keys.ACTIVE_SERVER_URL]
            val modeStr = prefs[Keys.ACTIVE_AUTH_MODE]
            if (url != null && modeStr != null) {
                ServerSelection(
                    url = url,
                    authMode = parseAuthMode(modeStr),
                    origin = prefs[Keys.ACTIVE_SERVER_ORIGIN]?.let(::parseServerOrigin),
                    version = prefs[Keys.ACTIVE_SERVER_VERSION],
                )
            } else {
                null
            }
        }

    val lastSelfHostedUrlFlow: Flow<String?> =
        context.serverDataStore.data.map { prefs -> prefs[Keys.LAST_SELF_HOSTED_URL] }

    val welcomeRequiredFlow: Flow<Boolean> =
        context.serverDataStore.data.map { prefs -> prefs[Keys.WELCOME_REQUIRED] ?: false }

    suspend fun setActiveServer(
        url: String,
        authMode: AuthMode,
        origin: ServerOrigin,
        version: String? = null,
    ) {
        context.serverDataStore.edit { prefs ->
            prefs[Keys.ACTIVE_SERVER_URL] = url
            prefs[Keys.ACTIVE_AUTH_MODE] = authMode.name.lowercase()
            prefs[Keys.ACTIVE_SERVER_ORIGIN] = origin.name.lowercase()
            prefs[Keys.WELCOME_REQUIRED] = false
            if (version != null) {
                prefs[Keys.ACTIVE_SERVER_VERSION] = version
            } else {
                prefs.remove(Keys.ACTIVE_SERVER_VERSION)
            }
        }
    }

    suspend fun setLastSelfHostedUrl(url: String) {
        context.serverDataStore.edit { prefs ->
            prefs[Keys.LAST_SELF_HOSTED_URL] = url
        }
    }

    suspend fun clearActiveServer() {
        context.serverDataStore.edit { prefs ->
            prefs.remove(Keys.ACTIVE_SERVER_URL)
            prefs.remove(Keys.ACTIVE_AUTH_MODE)
            prefs.remove(Keys.ACTIVE_SERVER_ORIGIN)
            prefs.remove(Keys.ACTIVE_SERVER_VERSION)
            prefs[Keys.WELCOME_REQUIRED] = true
        }
    }

    private fun parseAuthMode(s: String): AuthMode =
        when (s.lowercase()) {
            "clerk" -> AuthMode.CLERK
            "database" -> AuthMode.DATABASE
            else -> AuthMode.NOAUTH
        }

    private fun parseServerOrigin(value: String): ServerOrigin =
        when (value.lowercase()) {
            "self_hosted" -> ServerOrigin.SELF_HOSTED
            else -> ServerOrigin.HOSTED
        }
}
