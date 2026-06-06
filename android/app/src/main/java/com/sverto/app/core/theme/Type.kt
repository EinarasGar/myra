package com.sverto.app.core.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.font.FontWeight

// Expressive type scale: keep the M3 default metrics but lean into heavier weights for the
// display/headline/title roles so hero numbers and section headers carry expressive emphasis.
private val Default = Typography()

val Typography =
    Default.copy(
        displayLarge = Default.displayLarge.copy(fontWeight = FontWeight.Bold),
        displayMedium = Default.displayMedium.copy(fontWeight = FontWeight.Bold),
        displaySmall = Default.displaySmall.copy(fontWeight = FontWeight.Bold),
        headlineLarge = Default.headlineLarge.copy(fontWeight = FontWeight.SemiBold),
        headlineMedium = Default.headlineMedium.copy(fontWeight = FontWeight.SemiBold),
        headlineSmall = Default.headlineSmall.copy(fontWeight = FontWeight.SemiBold),
        titleLarge = Default.titleLarge.copy(fontWeight = FontWeight.SemiBold),
    )
