package com.sverto.app

import android.app.Application
import com.clerk.api.Clerk

class SvertoApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // Pre-load native libraries for UniFFI
        System.loadLibrary("jnidispatch")
        System.loadLibrary("sverto_core")

        // Initialize Clerk authentication
        val key = BuildConfig.CLERK_PUBLISHABLE_KEY
        if (key.isNotBlank()) {
            Clerk.initialize(this, publishableKey = key)
        }
    }
}
