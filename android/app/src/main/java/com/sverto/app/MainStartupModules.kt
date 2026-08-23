package com.sverto.app

internal data class MainStartupModules(
    val transactions: Boolean = false,
    val quickUploads: Boolean = false,
    val aiChat: Boolean = false,
)

internal data class SignedInStartupState(
    val userId: String,
    val onboarded: Boolean,
)

internal fun signedInStartupState(
    userId: String,
    onboardingVersion: Int,
    currentOnboardingVersion: Int,
): SignedInStartupState =
    SignedInStartupState(
        userId = userId,
        onboarded = onboardingVersion >= currentOnboardingVersion,
    )

internal fun mainStartupModules(
    currentRoute: String?,
    hasSharedImages: Boolean,
): MainStartupModules {
    val transactionRoute =
        currentRoute == "transactions" ||
            currentRoute?.startsWith("transactionDetail") == true ||
            currentRoute?.startsWith("createTransaction") == true ||
            currentRoute?.startsWith("editTransaction") == true ||
            currentRoute?.startsWith("groupAddTransaction") == true ||
            currentRoute?.startsWith("groupEditTransaction") == true
    val quickUploadRoute =
        currentRoute == "transactions" ||
            currentRoute?.startsWith("createTransaction") == true

    return MainStartupModules(
        transactions = transactionRoute || hasSharedImages,
        quickUploads = quickUploadRoute || hasSharedImages,
        aiChat = currentRoute == "ai_chat",
    )
}
