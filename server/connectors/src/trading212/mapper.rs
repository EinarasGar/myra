use crate::models::{MappedTransaction, ProviderTransaction, SkippedTransaction};
use serde_json::Value;

fn skipped(external_id: impl Into<String>, reason: impl Into<String>) -> MappedTransaction {
    MappedTransaction::Skipped(SkippedTransaction {
        external_id: external_id.into(),
        reason: reason.into(),
    })
}

fn parse_rfc3339(s: &str) -> Option<time::OffsetDateTime> {
    time::OffsetDateTime::parse(s, &time::format_description::well_known::Rfc3339).ok()
}

pub fn map_transaction(raw: &Value) -> MappedTransaction {
    let tx_type = raw
        .get("type")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");
    let Some(external_id) = raw
        .get("reference")
        .and_then(|v| v.as_str())
        .map(str::to_string)
    else {
        return skipped(
            "<missing reference>",
            "missing reference — cannot identify transaction",
        );
    };

    let cash_types = [
        "deposit",
        "withdrawal",
        "withdraw",
        "interest",
        "interest_on_free_cash",
        "lending_interest",
        "account_fee",
        "fee",
    ];
    if !cash_types.contains(&tx_type.to_lowercase().as_str()) {
        return skipped(external_id, "needs asset mapping — not imported");
    }

    let Some(amount) = raw.get("amount").and_then(crate::util::parse_decimal) else {
        return skipped(external_id, "missing or unparseable amount");
    };
    let Some(currency) = raw
        .get("currency")
        .and_then(|v| v.as_str())
        .map(str::to_string)
    else {
        return skipped(external_id, "missing currency");
    };
    let Some(date) = raw
        .get("dateTime")
        .and_then(|v| v.as_str())
        .and_then(parse_rfc3339)
    else {
        return skipped(external_id, "missing or unparseable dateTime");
    };
    let description = raw
        .get("description")
        .and_then(|v| v.as_str())
        .unwrap_or(tx_type)
        .to_string();

    MappedTransaction::Provider(ProviderTransaction {
        external_id,
        amount,
        currency,
        date,
        description,
        asset_identifier: None,
        quantity: None,
    })
}

pub fn map_order(raw: &Value) -> MappedTransaction {
    let order = raw.get("order").unwrap_or(raw);
    let fill = raw.get("fill").unwrap_or(raw);

    let Some(external_id) = order
        .get("id")
        .filter(|v| !v.is_null())
        .map(|v| v.to_string().trim_matches('"').to_string())
    else {
        return skipped(
            "<missing order id>",
            "missing order id — cannot identify order",
        );
    };

    let status = order
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");
    if status != "FILLED" {
        return skipped(external_id, format!("order not filled (status: {status})"));
    }

    let Some(ticker) = order
        .get("ticker")
        .and_then(|v| v.as_str())
        .map(str::to_string)
    else {
        return skipped(external_id, "missing ticker");
    };
    let side = order.get("side").and_then(|v| v.as_str()).unwrap_or("BUY");
    let Some(fill_quantity) = fill.get("quantity").and_then(crate::util::parse_decimal) else {
        return skipped(external_id, "missing or unparseable fill quantity");
    };
    let quantity = if side == "SELL" {
        -fill_quantity.abs()
    } else {
        fill_quantity.abs()
    };

    let Some(net_value) = fill
        .get("walletImpact")
        .and_then(|w| w.get("netValue"))
        .and_then(crate::util::parse_decimal)
        .or_else(|| {
            order
                .get("filledValue")
                .and_then(crate::util::parse_decimal)
        })
    else {
        return skipped(external_id, "missing or unparseable fill value");
    };
    let amount = if side == "SELL" {
        net_value.abs()
    } else {
        -net_value.abs()
    };

    let Some(currency) = fill
        .get("walletImpact")
        .and_then(|w| w.get("currency"))
        .or_else(|| order.get("currency"))
        .and_then(|v| v.as_str())
        .map(str::to_string)
    else {
        return skipped(external_id, "missing currency");
    };
    let Some(date) = fill
        .get("filledAt")
        .or_else(|| order.get("createdAt"))
        .and_then(|v| v.as_str())
        .and_then(parse_rfc3339)
    else {
        return skipped(external_id, "missing or unparseable fill date");
    };

    MappedTransaction::Provider(ProviderTransaction {
        external_id,
        amount,
        currency,
        date,
        description: format!("{side} {quantity} {ticker}"),
        asset_identifier: Some(ticker),
        quantity: Some(quantity),
    })
}

pub fn map_dividend(raw: &Value) -> MappedTransaction {
    let Some(external_id) = raw
        .get("reference")
        .and_then(|v| v.as_str())
        .map(str::to_string)
    else {
        return skipped(
            "<missing reference>",
            "missing reference — cannot identify dividend",
        );
    };
    let Some(ticker) = raw
        .get("ticker")
        .and_then(|v| v.as_str())
        .map(str::to_string)
    else {
        return skipped(external_id, "missing ticker");
    };
    let Some(amount) = raw.get("amount").and_then(crate::util::parse_decimal) else {
        return skipped(external_id, "missing or unparseable amount");
    };
    let Some(currency) = raw
        .get("currency")
        .and_then(|v| v.as_str())
        .map(str::to_string)
    else {
        return skipped(external_id, "missing currency");
    };
    let Some(date) = raw
        .get("paidOn")
        .and_then(|v| v.as_str())
        .and_then(parse_rfc3339)
    else {
        return skipped(external_id, "missing or unparseable paidOn date");
    };

    MappedTransaction::Provider(ProviderTransaction {
        external_id,
        amount,
        currency,
        date,
        description: format!("Dividend {ticker}"),
        asset_identifier: Some(ticker),
        quantity: None,
    })
}
