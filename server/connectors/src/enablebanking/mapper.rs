use crate::models::{MappedTransaction, ProviderTransaction, SkippedTransaction};
use serde_json::Value;

fn skipped(external_id: impl Into<String>, reason: impl Into<String>) -> MappedTransaction {
    MappedTransaction::Skipped(SkippedTransaction {
        external_id: external_id.into(),
        reason: reason.into(),
    })
}

pub fn map_transaction(tx: &Value) -> MappedTransaction {
    // Enable Banking never populates `transaction_id`; `entry_reference` is the stable identifier.
    let Some(external_id) = tx
        .get("entry_reference")
        .and_then(|v| v.as_str())
        .map(str::to_string)
    else {
        return skipped("<missing id>", "no usable transaction identifier");
    };

    if !is_booked(tx) {
        return skipped(external_id, "not booked — pending transaction, not imported");
    }

    let Some(amount_value) = tx.get("transaction_amount") else {
        return skipped(external_id, "missing transaction_amount");
    };
    let Some(amount) = amount_value
        .get("amount")
        .and_then(crate::util::parse_decimal)
    else {
        return skipped(external_id, "missing or unparseable amount");
    };
    let Some(currency) = amount_value
        .get("currency")
        .and_then(|v| v.as_str())
        .map(str::to_string)
    else {
        return skipped(external_id, "missing currency");
    };
    let Some(date) = tx
        .get("booking_date")
        .and_then(|v| v.as_str())
        .and_then(parse_date)
    else {
        return skipped(external_id, "missing or unparseable booking_date");
    };

    let description = build_description(tx);

    // Enable Banking always reports a positive `amount`; the sign lives in
    // `credit_debit_indicator`. DBIT = money out (negative), CRDT = money in (positive).
    let amount = match tx.get("credit_debit_indicator").and_then(|v| v.as_str()) {
        Some("DBIT") => -amount.abs(),
        Some("CRDT") => amount.abs(),
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

fn is_booked(tx: &Value) -> bool {
    // Enable Banking sends status as an uppercase PSD2 booking code ("BOOK", "PDNG", "INFO").
    // Only booked transactions are imported; pending and informational entries are dropped.
    tx.get("status")
        .and_then(|v| v.as_str())
        .map(|s| matches!(s, "booked" | "BOOK"))
        .unwrap_or(true)
}

fn build_description(tx: &Value) -> String {
    // `remittance_information` is a string array; join it into a readable label.
    let remittance = tx
        .get("remittance_information")
        .and_then(|v| v.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|v| v.as_str())
                .collect::<Vec<_>>()
                .join(" · ")
        })
        .filter(|s| !s.is_empty());

    if remittance.is_some() {
        return remittance.unwrap();
    }

    // Fall back to the counterparty name: for a debit the money goes to the creditor,
    // for a credit it comes from the debtor.
    let counterparty = match tx.get("credit_debit_indicator").and_then(|v| v.as_str()) {
        Some("DBIT") => tx.get("creditor"),
        Some("CRDT") => tx.get("debtor"),
        _ => tx.get("creditor"),
    };
    counterparty
        .and_then(|party| party.get("name"))
        .and_then(|v| v.as_str())
        .map(str::to_string)
        .unwrap_or_default()
}

fn parse_date(s: &str) -> Option<time::OffsetDateTime> {
    if let Ok(dt) =
        time::OffsetDateTime::parse(s, &time::format_description::well_known::Rfc3339)
    {
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

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn base_tx() -> Value {
        json!({
            "entry_reference": "6a4917b9-5b00-a4fb-976f-a626b35a02e3",
            "transaction_amount": { "currency": "GBP", "amount": "14.00" },
            "status": "BOOK",
            "booking_date": "2026-07-04",
            "credit_debit_indicator": "CRDT",
            "remittance_information": ["From Jane Doe"]
        })
    }

    #[test]
    fn debit_is_negative() {
        let mut tx = base_tx();
        tx["credit_debit_indicator"] = json!("DBIT");
        tx["transaction_amount"] = json!({ "currency": "GBP", "amount": "1000.00" });
        tx["remittance_information"] = json!(["Tuition Payment"]);
        match map_transaction(&tx) {
            MappedTransaction::Provider(p) => {
                assert_eq!(p.amount.to_string(), "-1000.00");
                assert_eq!(p.currency, "GBP");
            }
            MappedTransaction::Skipped(s) => panic!("expected provider tx, got skip: {s:?}"),
        }
    }

    #[test]
    fn credit_is_positive() {
        match map_transaction(&base_tx()) {
            MappedTransaction::Provider(p) => {
                assert_eq!(p.amount.to_string(), "14.00");
            }
            MappedTransaction::Skipped(s) => panic!("expected provider tx, got skip: {s:?}"),
        }
    }

    #[test]
    fn uses_entry_reference_as_id_when_transaction_id_null() {
        match map_transaction(&base_tx()) {
            MappedTransaction::Provider(p) => {
                assert_eq!(p.external_id, "6a4917b9-5b00-a4fb-976f-a626b35a02e3");
            }
            MappedTransaction::Skipped(s) => panic!("expected provider tx, got skip: {s:?}"),
        }
    }

    #[test]
    fn joins_array_remittance_into_description() {
        let mut tx = base_tx();
        tx["remittance_information"] = json!(["TO CONVERT TO EURO", "Payment from Jane D"]);
        match map_transaction(&tx) {
            MappedTransaction::Provider(p) => {
                assert_eq!(p.description, "TO CONVERT TO EURO · Payment from Jane D");
            }
            MappedTransaction::Skipped(s) => panic!("expected provider tx, got skip: {s:?}"),
        }
    }

    #[test]
    fn falls_back_to_counterparty_name() {
        let mut tx = base_tx();
        tx["remittance_information"] = json!([]);
        tx["credit_debit_indicator"] = json!("DBIT");
        tx["creditor"] = json!({ "name": "Carsharing Ltd", "postal_address": null });
        match map_transaction(&tx) {
            MappedTransaction::Provider(p) => {
                assert_eq!(p.description, "Carsharing Ltd");
            }
            MappedTransaction::Skipped(s) => panic!("expected provider tx, got skip: {s:?}"),
        }
    }

    #[test]
    fn missing_entry_reference_is_skipped() {
        let mut tx = base_tx();
        tx.as_object_mut().unwrap().remove("entry_reference");
        match map_transaction(&tx) {
            MappedTransaction::Skipped(s) => assert!(s.reason.contains("identifier")),
            MappedTransaction::Provider(_) => panic!("expected skip"),
        }
    }

    #[test]
    fn pending_is_skipped() {
        let mut tx = base_tx();
        tx["status"] = json!("PDNG");
        match map_transaction(&tx) {
            MappedTransaction::Skipped(s) => assert!(s.reason.contains("not booked")),
            MappedTransaction::Provider(_) => panic!("expected skip"),
        }
    }

    #[test]
    fn unparseable_booking_date_is_skipped() {
        let mut tx = base_tx();
        tx["booking_date"] = json!("15/03/2024");
        match map_transaction(&tx) {
            MappedTransaction::Skipped(s) => assert!(s.reason.contains("booking_date")),
            MappedTransaction::Provider(_) => panic!("expected skip"),
        }
    }

    /// Representative Enable Banking transaction payloads (shapes verified against the live API
    /// during development). Guards against regressions in field names, array-shaped remittance,
    /// and DBIT/CRDT sign handling.
    #[test]
    fn maps_real_shaped_transactions_with_correct_sign() {
        let txs = serde_json::json!([
            {
                "entry_reference": "6a4917b9-5b00-a4fb-976f-a626b35a02e3",
                "transaction_amount": {"currency": "GBP", "amount": "14.00"},
                "status": "BOOK", "booking_date": "2026-07-04",
                "credit_debit_indicator": "CRDT",
                "remittance_information": ["From Jane Doe"]
            },
            {
                "entry_reference": "6a87636c-7605-ab5c-96f9-aad59021c1a2",
                "transaction_amount": {"currency": "GBP", "amount": "1000.00"},
                "status": "BOOK", "booking_date": "2026-08-20",
                "credit_debit_indicator": "DBIT",
                "remittance_information": ["Tuition Payment"],
                "bank_transaction_code": {"code": "CARD_PAYMENT"}
            },
            {
                "entry_reference": "6a8762d1-6a9d-ac39-b99d-a569d8687034",
                "transaction_amount": {"currency": "GBP", "amount": "991.72"},
                "status": "BOOK", "booking_date": "2026-08-20",
                "credit_debit_indicator": "CRDT",
                "remittance_information": ["Exchanged to GBP"]
            },
            {
                "entry_reference": "6a7826c5-3f07-a9db-b135-55e32dc5d7c4",
                "transaction_amount": {"currency": "GBP", "amount": "200.00"},
                "status": "BOOK", "booking_date": "2026-08-09",
                "credit_debit_indicator": "DBIT",
                "remittance_information": ["Exchanged to EUR"]
            },
            {
                "entry_reference": "6a7826a1-d419-ab59-8e39-d793cf1c96b8",
                "transaction_amount": {"currency": "GBP", "amount": "200.00"},
                "status": "BOOK", "booking_date": "2026-08-09",
                "credit_debit_indicator": "CRDT",
                "remittance_information": ["TO CONVERT TO EURO", "Payment from Jane D"]
            },
            {
                "entry_reference": "6a5e04d9-1404-a962-8cee-a5265b9ce859",
                "transaction_amount": {"currency": "GBP", "amount": "137.00"},
                "status": "BOOK", "booking_date": "2026-07-20",
                "credit_debit_indicator": "DBIT",
                "remittance_information": ["Rent", "To John Doe"]
            }
        ]);

        let txs = txs.as_array().unwrap().iter().collect::<Vec<_>>();
        assert_eq!(txs.len(), 6);
        let mut mapped = 0;
        let mut skipped = 0;
        for tx in &txs {
            match map_transaction(tx) {
                MappedTransaction::Provider(p) => {
                    mapped += 1;
                    assert!(!p.external_id.is_empty(), "external_id must not be empty");
                    let cdi = tx["credit_debit_indicator"].as_str().unwrap();
                    if cdi == "DBIT" {
                        assert!(p.amount.is_sign_negative(), "debit must be negative, got {}", p.amount);
                    } else if cdi == "CRDT" {
                        assert!(p.amount.is_sign_positive(), "credit must be positive, got {}", p.amount);
                    }
                }
                MappedTransaction::Skipped(s) => {
                    skipped += 1;
                    panic!("unexpected skip: {} — {}", s.external_id, s.reason);
                }
            }
        }
        assert_eq!(mapped, 6, "all representative transactions must map");
        assert_eq!(skipped, 0);
    }
}
