use crate::models::{MappedTransaction, ProviderTransaction, SkippedTransaction};
use serde_json::Value;

fn parse_booking_date(s: &str) -> Option<time::OffsetDateTime> {
    if let Ok(dt) = time::OffsetDateTime::parse(s, &time::format_description::well_known::Rfc3339) {
        return Some(dt);
    }
    let parts: Vec<&str> = s.split('-').collect();
    if parts.len() != 3 {
        return None;
    }
    let year = parts[0].parse::<i32>().ok()?;
    let month = parts[1].parse::<u8>().ok()?;
    let day = parts[2].parse::<u8>().ok()?;
    use time::PrimitiveDateTime;
    let dt = PrimitiveDateTime::new(
        time::Date::from_calendar_date(year, time::Month::try_from(month).ok()?, day).ok()?,
        time::Time::MIDNIGHT,
    );
    Some(dt.assume_utc())
}

pub fn derive_external_id(tx: &Value) -> Option<String> {
    if let Some(normalised) = tx
        .get("normalised_provider_transaction_id")
        .and_then(|v| v.as_str())
    {
        return Some(normalised.to_string());
    }
    if let Some(bank_id) = tx
        .get("meta")
        .and_then(|m| m.get("bank_transaction_id"))
        .and_then(|v| v.as_str())
    {
        return Some(bank_id.to_string());
    }
    tx.get("transaction_id")
        .and_then(|v| v.as_str())
        .map(str::to_string)
}

pub fn is_booked(tx: &Value) -> bool {
    tx.get("status")
        .and_then(|v| v.as_str())
        .map(|s| s == "booked")
        .unwrap_or(true)
}

fn skipped(external_id: impl Into<String>, reason: impl Into<String>) -> MappedTransaction {
    MappedTransaction::Skipped(SkippedTransaction {
        external_id: external_id.into(),
        reason: reason.into(),
    })
}

pub fn map_transaction(tx: &Value) -> MappedTransaction {
    let Some(external_id) = derive_external_id(tx) else {
        return skipped("<missing id>", "no usable transaction identifier");
    };
    if !is_booked(tx) {
        return skipped(
            external_id,
            "not booked — pending transaction, not imported",
        );
    }
    let Some(amount) = tx
        .get("amount")
        .and_then(crate::util::parse_decimal)
        .or_else(|| {
            tx.get("transaction_amount")
                .and_then(|v| v.get("amount"))
                .and_then(crate::util::parse_decimal)
        })
    else {
        return skipped(external_id, "missing or unparseable amount");
    };
    let Some(currency) = tx
        .get("currency")
        .or_else(|| tx.get("transaction_amount").and_then(|v| v.get("currency")))
        .and_then(|v| v.as_str())
        .map(str::to_string)
    else {
        return skipped(external_id, "missing currency");
    };
    let Some(date) = tx
        .get("timestamp")
        .and_then(|v| v.as_str())
        .and_then(|s| {
            time::OffsetDateTime::parse(s, &time::format_description::well_known::Rfc3339).ok()
        })
        .or_else(|| {
            parse_booking_date(
                tx.get("booking_date")
                    .and_then(|v| v.as_str())
                    .unwrap_or(""),
            )
        })
    else {
        return skipped(external_id, "missing or unparseable timestamp");
    };
    let description = tx
        .get("description")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    // TrueLayer signs `amount` from the account-balance perspective, which inverts for cards
    // (a liability): a card payment (CREDIT) arrives negative and a purchase (DEBIT) positive.
    // Normalise to a cashflow convention via the authoritative `transaction_type` — DEBIT (out)
    // negative, CREDIT (in) positive — so cards and bank accounts are consistent. Falls back to
    // the raw signed amount when `transaction_type` is absent.
    let amount = match tx.get("transaction_type").and_then(|v| v.as_str()) {
        Some("DEBIT") => -amount.abs(),
        Some("CREDIT") => amount.abs(),
        _ => amount,
    };

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
