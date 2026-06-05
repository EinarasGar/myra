package com.sverto.app.core.icons

import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import com.composables.icons.lucide.R as LucideR

/** A selectable Lucide icon: its stored (kebab) name and its bundled drawable resource id. */
data class IconEntry(
    val name: String,
    val resId: Int,
)

/**
 * Convert a stored icon name to the bundled drawable name.
 * Handles Lucide kebab names ("shopping-cart" -> "lucide_ic_shopping_cart") and
 * legacy underscore names ("money_off" -> "lucide_ic_money_off", which falls back if absent).
 */
fun lucideDrawableName(stored: String): String = "lucide_ic_" + stored.trim().lowercase().replace('-', '_')

/** Reverse mapping: drawable field "lucide_ic_shopping_cart" -> stored name "shopping-cart". */
fun storedIconName(drawableField: String): String = drawableField.removePrefix("lucide_ic_").replace('_', '-')

/**
 * All bundled Lucide icons, discovered once by reflecting over the Lucide library's own R class.
 * The app uses non-transitive R classes (android.nonTransitiveRClass=true), so the library's
 * drawables live in com.composables.icons.lucide.R, not the app's R.
 */
object LucideIcons {
    val all: List<IconEntry> by lazy {
        LucideR.drawable::class.java.fields
            .asSequence()
            .filter { it.name.startsWith("lucide_ic_") }
            .map { IconEntry(storedIconName(it.name), it.getInt(null)) }
            .sortedBy { it.name }
            .toList()
    }
}

@Composable
fun LucideIcon(
    name: String,
    modifier: Modifier = Modifier,
    tint: Color = MaterialTheme.colorScheme.onSurface,
) {
    val context = LocalContext.current
    val resId =
        remember(name) {
            val drawableName = lucideDrawableName(name)
            val id = context.resources.getIdentifier(drawableName, "drawable", context.packageName)
            if (id != 0) id else LucideR.drawable.lucide_ic_tag
        }
    Icon(
        painter = painterResource(id = resId),
        contentDescription = null,
        tint = tint,
        modifier = modifier,
    )
}
