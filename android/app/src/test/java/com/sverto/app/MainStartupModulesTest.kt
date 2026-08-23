package com.sverto.app

import org.junit.Assert.assertEquals
import org.junit.Test

class MainStartupModulesTest {
    @Test
    fun portfolio_starts_without_hidden_modules() {
        assertEquals(
            MainStartupModules(),
            mainStartupModules(currentRoute = "portfolio", hasSharedImages = false),
        )
    }

    @Test
    fun transactions_starts_transaction_modules() {
        assertEquals(
            MainStartupModules(transactions = true, quickUploads = true),
            mainStartupModules(currentRoute = "transactions", hasSharedImages = false),
        )
    }

    @Test
    fun myra_starts_only_chat_module() {
        assertEquals(
            MainStartupModules(aiChat = true),
            mainStartupModules(currentRoute = "ai_chat", hasSharedImages = false),
        )
    }

    @Test
    fun transaction_detail_keeps_transaction_module_available() {
        assertEquals(
            MainStartupModules(transactions = true),
            mainStartupModules(
                currentRoute = "transactionDetail/{txId}",
                hasSharedImages = false,
            ),
        )
    }

    @Test
    fun shared_images_start_transaction_modules() {
        assertEquals(
            MainStartupModules(transactions = true, quickUploads = true),
            mainStartupModules(currentRoute = "portfolio", hasSharedImages = true),
        )
    }

    @Test
    fun cached_user_restores_onboarding_destination() {
        assertEquals(
            SignedInStartupState(userId = "user-id", onboarded = true),
            signedInStartupState(
                userId = "user-id",
                onboardingVersion = 1,
                currentOnboardingVersion = 1,
            ),
        )
    }
}
