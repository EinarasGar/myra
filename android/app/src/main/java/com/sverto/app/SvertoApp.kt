package com.sverto.app

import android.app.Application
import android.net.ConnectivityManager
import android.net.Network
import com.clerk.api.Clerk
import uniffi.sverto_core.ApiClient

class SvertoApp : Application() {
    lateinit var apiClient: ApiClient
        private set

    override fun onCreate() {
        super.onCreate()
        System.loadLibrary("jnidispatch")
        System.loadLibrary("sverto_core")

        apiClient =
            ApiClient(
                BuildConfig.API_BASE_URL,
                60u,
                "${filesDir.absolutePath}/sverto_cache.db",
            )

        registerConnectivityCallback()

        val key = BuildConfig.CLERK_PUBLISHABLE_KEY
        if (key.isNotBlank()) {
            Clerk.initialize(this, publishableKey = key)
        }
    }

    private fun registerConnectivityCallback() {
        val cm = getSystemService(ConnectivityManager::class.java)
        apiClient.setConnectivity(cm.activeNetwork != null)
        cm.registerDefaultNetworkCallback(
            object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    apiClient.setConnectivity(true)
                }

                override fun onLost(network: Network) {
                    apiClient.setConnectivity(false)
                }
            },
        )
    }
}
