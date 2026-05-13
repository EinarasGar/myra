package com.sverto.app

import android.app.Application
import android.net.ConnectivityManager
import android.net.Network
import com.clerk.api.Clerk
import com.clerk.api.network.serialization.ClerkResult
import kotlinx.coroutines.runBlocking
import uniffi.sverto_core.AppStore
import uniffi.sverto_core.AuthProvider

class SvertoAuthProvider : AuthProvider {
    override fun getToken(): String? {
        if (BuildConfig.CLERK_PUBLISHABLE_KEY.isBlank()) return null
        return runBlocking {
            when (val result = Clerk.auth.getToken()) {
                is ClerkResult.Success -> result.value
                is ClerkResult.Failure -> null
            }
        }
    }

    override fun getUserId(): String? {
        if (BuildConfig.CLERK_PUBLISHABLE_KEY.isBlank()) return null
        return Clerk.user?.id
    }
}

class SvertoApp : Application() {
    lateinit var appStore: AppStore
        private set

    override fun onCreate() {
        super.onCreate()
        System.loadLibrary("jnidispatch")
        System.loadLibrary("sverto_core")

        val dbPath = "${filesDir.absolutePath}/sverto_cache.db"

        appStore = AppStore(
            BuildConfig.API_BASE_URL,
            60u,
            dbPath,
            SvertoAuthProvider(),
        )

        registerConnectivityCallback()

        val key = BuildConfig.CLERK_PUBLISHABLE_KEY
        if (key.isNotBlank()) {
            Clerk.initialize(this, publishableKey = key)
        }
    }

    private fun registerConnectivityCallback() {
        val cm = getSystemService(ConnectivityManager::class.java)
        val connected = cm.activeNetwork != null
        appStore.setConnectivity(connected)
        cm.registerDefaultNetworkCallback(
            object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    appStore.setConnectivity(true)
                }

                override fun onLost(network: Network) {
                    appStore.setConnectivity(false)
                }
            },
        )
    }
}
