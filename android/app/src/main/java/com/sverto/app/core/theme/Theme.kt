package com.sverto.app.core.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.MaterialExpressiveTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MotionScheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.expressiveLightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.clerk.api.ui.ClerkColors
import com.clerk.api.ui.ClerkDesign
import com.clerk.api.ui.ClerkTheme

@Suppress("CompositionLocalAllowlist")
val LocalClerkTheme = staticCompositionLocalOf<ClerkTheme?> { null }

private val DarkColorScheme =
    darkColorScheme(
        primary = Purple80,
        secondary = PurpleGrey80,
        tertiary = Pink80,
    )

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun SvertoTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit,
) {
    val colorScheme =
        when {
            dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
                val context = LocalContext.current
                if (darkTheme) {
                    dynamicDarkColorScheme(context)
                } else {
                    dynamicLightColorScheme(context)
                }
            }
            darkTheme -> DarkColorScheme
            else -> expressiveLightColorScheme()
        }

    MaterialExpressiveTheme(
        colorScheme = colorScheme,
        typography = Typography,
        motionScheme = MotionScheme.expressive(),
    ) {
        val clerkTheme = rememberClerkTheme()
        CompositionLocalProvider(LocalClerkTheme provides clerkTheme) {
            content()
        }
    }
}

@Composable
private fun rememberClerkTheme(): ClerkTheme {
    val colorScheme = MaterialTheme.colorScheme
    return remember(colorScheme) {
        ClerkTheme(
            colors =
                ClerkColors(
                    primary = colorScheme.primary,
                    background = colorScheme.surface,
                    input = colorScheme.surfaceContainerHigh,
                    danger = colorScheme.error,
                    success = colorScheme.tertiary,
                    foreground = colorScheme.onSurface,
                    mutedForeground = colorScheme.onSurfaceVariant,
                    primaryForeground = colorScheme.onPrimary,
                    inputForeground = colorScheme.onSurface,
                    neutral = colorScheme.outline,
                    border = colorScheme.outlineVariant,
                    ring = colorScheme.primary,
                    muted = colorScheme.surfaceContainerLow,
                    shadow = colorScheme.scrim,
                ),
            design = ClerkDesign(borderRadius = 16.dp),
        )
    }
}
