package com.sverto.app.feature.connectors

data class ConnectorInfo(
    val kind: String,
    val name: String,
    val icon: String,
    val tagline: String,
    val description: String,
)

val CONNECTORS =
    listOf(
        ConnectorInfo(
            kind = "truelayer",
            name = "TrueLayer",
            icon = "landmark",
            tagline = "Bank accounts via Open Banking",
            description =
                "Connect your bank accounts through TrueLayer's Open Banking platform. " +
                    "Sverto imports balances and transaction history, and keeps them up to date. " +
                    "You authorise access at your bank; Sverto never sees your bank login.",
        ),
        ConnectorInfo(
            kind = "trading212",
            name = "Trading 212",
            icon = "chart-candlestick",
            tagline = "Investment account history",
            description =
                "Import your Trading 212 orders, dividends and cash movements using a " +
                    "Trading 212 API key. You choose where the key is kept: on Sverto's servers, " +
                    "or only on this device.",
        ),
    )
