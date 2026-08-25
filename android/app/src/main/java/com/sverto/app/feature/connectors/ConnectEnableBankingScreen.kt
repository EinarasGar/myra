package com.sverto.app.feature.connectors

import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Cancel
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeFlexibleTopAppBar
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.LoadingIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sverto.app.core.SvertoViewModelFactory
import com.sverto.app.core.icons.LucideIcon

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ConnectEnableBankingScreen(
    oauthState: String?,
    oauthCode: String?,
    oauthError: String?,
    onBack: () -> Unit,
    onCompleted: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ConnectEnableBankingViewModel = viewModel(factory = SvertoViewModelFactory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var countrySheetOpen by remember { mutableStateOf(false) }

    LaunchedEffect(oauthState) {
        if (oauthState != null) viewModel.complete(oauthState, oauthCode, oauthError)
    }
    LaunchedEffect(state.launchUrl) {
        state.launchUrl?.let { url ->
            viewModel.consumeLaunchUrl()
            CustomTabsIntent.Builder().build().launchUrl(context, Uri.parse(url))
        }
    }
    LaunchedEffect(state.phase) {
        if (state.phase == EnableBankingPhase.COMPLETED) {
            val connectionId = state.connectionId
            viewModel.consumeCompleted()
            connectionId?.let(onCompleted)
        }
    }

    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()

    Scaffold(
        modifier =
            modifier
                .fillMaxSize()
                .nestedScroll(scrollBehavior.nestedScrollConnection),
        containerColor = MaterialTheme.colorScheme.surfaceContainer,
        topBar = {
            LargeFlexibleTopAppBar(
                title = { Text("Connect your bank") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors =
                    TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainer,
                        scrolledContainerColor = MaterialTheme.colorScheme.surfaceContainer,
                    ),
                scrollBehavior = scrollBehavior,
            )
        },
        bottomBar = {
            if (state.phase != EnableBankingPhase.WORKING) {
                HeroButton(
                    text = "Continue to your bank",
                    icon = "landmark",
                    enabled = state.selectedBank != null,
                    onClick = { viewModel.begin() },
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 24.dp, vertical = 12.dp)
                            .navigationBarsPadding(),
                )
            }
        },
    ) { innerPadding ->
        Box(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
        ) {
            if (state.phase == EnableBankingPhase.WORKING) {
                Column(
                    modifier =
                        Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    LoadingIndicator(modifier = Modifier.size(72.dp))
                    Spacer(Modifier.height(16.dp))
                    Text(
                        "Connecting your bank…",
                        style = MaterialTheme.typography.titleMedium,
                    )
                }
                return@Box
            }
            Column(
                modifier =
                    Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(24.dp),
            ) {
                ProviderAvatar(
                    icon = "landmark",
                    size = 64.dp,
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                )
                Spacer(Modifier.height(24.dp))
                Text(
                    "Link your bank securely through Open Banking. Here's how it works:",
                    style = MaterialTheme.typography.bodyLarge,
                )
                Spacer(Modifier.height(20.dp))
                EnableBankingStep(icon = "search", text = "Pick your country and find your bank")
                Spacer(Modifier.height(12.dp))
                EnableBankingStep(
                    icon = "shield-check",
                    text = "Approve access at your bank — Sverto never sees your login",
                )
                Spacer(Modifier.height(12.dp))
                EnableBankingStep(icon = "refresh-cw", text = "Your transactions import automatically")
                Spacer(Modifier.height(20.dp))

                var banksExpanded by remember { mutableStateOf(false) }

                CountryPickerField(
                    selected = state.country,
                    onClick = { countrySheetOpen = true },
                )
                Spacer(Modifier.height(12.dp))
                ExposedDropdownMenuBox(
                    expanded = banksExpanded && state.aspsps.isNotEmpty(),
                    onExpandedChange = { banksExpanded = it },
                ) {
                    OutlinedTextField(
                        value = state.selectedBank ?: "",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Your bank") },
                        placeholder = { Text(if (state.banksLoading) "Loading…" else "Load banks first") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = banksExpanded) },
                        colors = ExposedDropdownMenuDefaults.outlinedTextFieldColors(),
                        shape = RoundedCornerShape(16.dp),
                        modifier =
                            Modifier
                                .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                                .fillMaxWidth(),
                    )
                    ExposedDropdownMenu(
                        expanded = banksExpanded && state.aspsps.isNotEmpty(),
                        onDismissRequest = { banksExpanded = false },
                    ) {
                        state.aspsps.forEach { aspsp ->
                            DropdownMenuItem(
                                text = { Text(aspsp.name) },
                                onClick = {
                                    viewModel.selectBank(aspsp.name)
                                    banksExpanded = false
                                },
                            )
                        }
                    }
                }

                Spacer(Modifier.height(16.dp))
                when (state.phase) {
                    EnableBankingPhase.DENIED ->
                        Text(
                            "Access was denied at the bank. You can try again.",
                            color = MaterialTheme.colorScheme.error,
                        )
                    EnableBankingPhase.FAILED ->
                        Text(
                            state.error ?: "Something went wrong. Try again.",
                            color = MaterialTheme.colorScheme.error,
                        )
                    else -> {}
                }
            }
        }
    }

    if (countrySheetOpen) {
        CountryPickerSheet(
            selected = state.country,
            onSelect = { code ->
                viewModel.setCountry(code)
                countrySheetOpen = false
            },
            onDismiss = { countrySheetOpen = false },
        )
    }
}

private val ENABLE_BANKING_COUNTRIES =
    listOf("FI", "SE", "DK", "NO", "GB", "DE", "FR", "NL", "EE", "LV", "LT")

@Composable
private fun EnableBankingStep(
    icon: String,
    text: String,
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        LucideIcon(
            name = icon,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(20.dp),
        )
        Spacer(Modifier.size(12.dp))
        Text(text, style = MaterialTheme.typography.bodyMedium)
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun CountryPickerField(
    selected: String?,
    onClick: () -> Unit,
) {
    OutlinedTextField(
        value = selected ?: "",
        onValueChange = {},
        readOnly = true,
        label = { Text("Country") },
        placeholder = { Text("Pick a country") },
        trailingIcon = { Icon(Icons.Outlined.Search, contentDescription = null) },
        shape = RoundedCornerShape(16.dp),
        modifier =
            Modifier
                .fillMaxWidth()
                .clickable(onClick = onClick),
        enabled = false,
    )
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun CountryPickerSheet(
    selected: String?,
    onSelect: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var query by remember { mutableStateOf("") }

    val results =
        remember(query) {
            if (query.isBlank()) {
                ENABLE_BANKING_COUNTRIES
            } else {
                ENABLE_BANKING_COUNTRIES
                    .filter { it.contains(query, ignoreCase = true) }
            }
        }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        containerColor = MaterialTheme.colorScheme.surfaceContainer,
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.7f)
                .padding(horizontal = 12.dp),
        ) {
            Text(
                "Pick your country",
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.padding(start = 8.dp, top = 4.dp, bottom = 12.dp),
            )
            Surface(
                shape = RoundedCornerShape(28.dp),
                color = MaterialTheme.colorScheme.surfaceBright,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .heightIn(min = 56.dp)
                            .padding(horizontal = 16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Outlined.Search,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.size(12.dp))
                    BasicTextField(
                        value = query,
                        onValueChange = { query = it },
                        singleLine = true,
                        textStyle =
                            TextStyle(
                                color = MaterialTheme.colorScheme.onSurface,
                                fontSize = MaterialTheme.typography.bodyLarge.fontSize,
                            ),
                        cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                        modifier = Modifier.weight(1f),
                        decorationBox = { inner ->
                            if (query.isEmpty()) {
                                Text(
                                    "Search countries…",
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            inner()
                        },
                    )
                    if (query.isNotEmpty()) {
                        IconButton(onClick = { query = "" }) {
                            Icon(Icons.Outlined.Cancel, contentDescription = "Clear")
                        }
                    }
                }
            }
            Spacer(Modifier.size(8.dp))
            if (results.isEmpty()) {
                Box(
                    Modifier.fillMaxWidth().padding(32.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        if (query.isBlank()) "No countries available" else "No matches for \"$query\"",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            } else {
                LazyColumn(Modifier.fillMaxWidth()) {
                    items(results, key = { it }) { code ->
                        HorizontalDivider(
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            modifier = Modifier.padding(horizontal = 8.dp),
                        )
                        ListItem(
                            headlineContent = {
                                Text(code, style = MaterialTheme.typography.bodyLarge)
                            },
                            colors = ListItemDefaults.colors(
                                containerColor = MaterialTheme.colorScheme.surfaceContainer,
                            ),
                            modifier =
                                Modifier
                                    .fillMaxWidth()
                                    .clickable { onSelect(code) },
                        )
                    }
                }
            }
        }
    }
}
