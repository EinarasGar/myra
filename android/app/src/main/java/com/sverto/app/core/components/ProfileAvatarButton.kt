package com.sverto.app.core.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.clerk.api.Clerk
import com.sverto.app.BuildConfig
import com.sverto.app.core.icons.LucideIcon

@Composable
fun ProfileAvatarButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val initials =
        if (BuildConfig.CLERK_PUBLISHABLE_KEY.isNotBlank()) {
            val user = Clerk.user
            val firstName = user?.firstName
            val lastName = user?.lastName
            val first =
                firstName
                    ?.firstOrNull()
                    ?.uppercaseChar()
                    ?.toString()
                    .orEmpty()
            val last =
                lastName
                    ?.firstOrNull()
                    ?.uppercaseChar()
                    ?.toString()
                    .orEmpty()
            (first + last)
        } else {
            ""
        }

    IconButton(
        onClick = onClick,
        modifier = modifier.semantics { contentDescription = "Profile and settings" },
    ) {
        Surface(
            shape = CircleShape,
            color = MaterialTheme.colorScheme.primaryContainer,
            modifier = Modifier.size(32.dp),
        ) {
            Box(contentAlignment = Alignment.Center) {
                if (initials.isNotBlank()) {
                    Text(
                        text = initials,
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                    )
                } else {
                    LucideIcon(
                        name = "user",
                        tint = MaterialTheme.colorScheme.onPrimaryContainer,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
        }
    }
}
