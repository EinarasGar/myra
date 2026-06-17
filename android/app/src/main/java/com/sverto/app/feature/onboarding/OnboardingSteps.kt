package com.sverto.app.feature.onboarding

const val CURRENT_ONBOARDING_VERSION = 1

enum class OnboardingStepId { WELCOME, BASE_CURRENCY, NOTIFICATIONS }

private data class OnboardingStepDef(
    val id: OnboardingStepId,
    val introducedIn: Int,
)

private val ALL_STEPS =
    listOf(
        OnboardingStepDef(OnboardingStepId.WELCOME, 1),
        OnboardingStepDef(OnboardingStepId.BASE_CURRENCY, 1),
        OnboardingStepDef(OnboardingStepId.NOTIFICATIONS, 1),
    )

fun stepsForVersion(completedVersion: Int): List<OnboardingStepId> = ALL_STEPS.filter { it.introducedIn > completedVersion }.map { it.id }
