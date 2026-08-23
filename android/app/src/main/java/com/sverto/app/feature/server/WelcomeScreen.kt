package com.sverto.app.feature.server

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.sverto.app.feature.onboarding.OnboardingPageIndicator
import com.sverto.app.feature.onboarding.WelcomePage
import com.sverto.app.feature.onboarding.stepsForVersion

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun WelcomeScreen(
    onContinueWithHost: () -> Unit,
    onConnectSelfHosted: () -> Unit,
) {
    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = MaterialTheme.colorScheme.surface,
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).statusBarsPadding(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(24.dp))
            OnboardingPageIndicator(
                pageCount = stepsForVersion(0).size,
                currentPage = 0,
            )
            Spacer(Modifier.height(8.dp))
            WelcomePage(modifier = Modifier.weight(1f))
            Column(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 24.dp)
                        .padding(top = 12.dp, bottom = 20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Button(
                    onClick = onContinueWithHost,
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    shapes = ButtonDefaults.shapes(shape = MaterialTheme.shapes.extraLarge),
                ) {
                    Text("Next")
                }
                TextButton(
                    onClick = onConnectSelfHosted,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = ServerCopy.CONNECT_SELF_HOSTED,
                        textDecoration = TextDecoration.Underline,
                    )
                }
            }
        }
    }
}
