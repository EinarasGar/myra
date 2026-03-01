use rust_decimal::Decimal;

use crate::errors::{ApiError, FieldError};
use crate::view_models::transactions::base_models::account_asset_entry::AccountAssetEntryViewModel;
use crate::view_models::transactions::transaction_types::TransactionWithEntries;
use crate::view_models::transactions::value_types::IntoDecimal;

/// Trait for validating inbound request view models.
/// Implementations check domain constraints (e.g., amount signs) and
/// return `ApiError::Validation` with structured field errors on failure.
pub trait Validatable {
    fn validate(&self) -> Result<(), ApiError>;
}

fn validate_positive(
    entry: &AccountAssetEntryViewModel,
    field_prefix: &str,
) -> Option<FieldError> {
    if entry.amount.as_decimal() <= Decimal::ZERO {
        Some(FieldError {
            field: format!("{}.amount", field_prefix),
            message: "Must be a positive value.".to_string(),
        })
    } else {
        None
    }
}

fn validate_negative(
    entry: &AccountAssetEntryViewModel,
    field_prefix: &str,
) -> Option<FieldError> {
    if entry.amount.as_decimal() >= Decimal::ZERO {
        Some(FieldError {
            field: format!("{}.amount", field_prefix),
            message: "Must be a negative value.".to_string(),
        })
    } else {
        None
    }
}

fn validate_non_zero(
    entry: &AccountAssetEntryViewModel,
    field_prefix: &str,
) -> Option<FieldError> {
    if entry.amount.as_decimal() == Decimal::ZERO {
        Some(FieldError {
            field: format!("{}.amount", field_prefix),
            message: "Must not be zero.".to_string(),
        })
    } else {
        None
    }
}

/// Returns errors for **both** fields when the accounts don't match,
/// so the user knows that either side can be corrected.
fn validate_same_account(
    entry_a: &AccountAssetEntryViewModel,
    field_a: &str,
    entry_b: &AccountAssetEntryViewModel,
    field_b: &str,
) -> [Option<FieldError>; 2] {
    if entry_a.account_id.0 != entry_b.account_id.0 {
        let msg = format!(
            "{}.account_id and {}.account_id must reference the same account.",
            field_a, field_b
        );
        [
            Some(FieldError {
                field: format!("{}.account_id", field_a),
                message: msg.clone(),
            }),
            Some(FieldError {
                field: format!("{}.account_id", field_b),
                message: msg,
            }),
        ]
    } else {
        [None, None]
    }
}

fn collect_errors(errors: Vec<Option<FieldError>>) -> Result<(), ApiError> {
    let errors: Vec<FieldError> = errors.into_iter().flatten().collect();
    if errors.is_empty() {
        Ok(())
    } else {
        Err(ApiError::Validation(errors))
    }
}

impl Validatable for TransactionWithEntries {
    fn validate(&self) -> Result<(), ApiError> {
        match self {
            TransactionWithEntries::RegularTransaction(t) => {
                collect_errors(vec![validate_non_zero(&t.entry, "entry")])
            }
            TransactionWithEntries::CashTransferIn(t) => {
                collect_errors(vec![validate_positive(&t.entry, "entry")])
            }
            TransactionWithEntries::CashTransferOut(t) => {
                collect_errors(vec![validate_negative(&t.entry, "entry")])
            }
            TransactionWithEntries::CashDividend(t) => {
                collect_errors(vec![validate_positive(&t.entry, "entry")])
            }
            TransactionWithEntries::AssetDividend(t) => {
                collect_errors(vec![validate_positive(&t.entry, "entry")])
            }
            TransactionWithEntries::AssetPurchase(t) => {
                let [acct_a, acct_b] = validate_same_account(
                    &t.purchase_change,
                    "purchase_change",
                    &t.cash_outgoings_change,
                    "cash_outgoings_change",
                );
                collect_errors(vec![
                    validate_positive(&t.purchase_change, "purchase_change"),
                    validate_negative(&t.cash_outgoings_change, "cash_outgoings_change"),
                    acct_a,
                    acct_b,
                ])
            }
            TransactionWithEntries::AssetSale(t) => {
                let [acct_a, acct_b] = validate_same_account(
                    &t.sale_entry,
                    "sale_entry",
                    &t.proceeds_entry,
                    "proceeds_entry",
                );
                collect_errors(vec![
                    validate_negative(&t.sale_entry, "sale_entry"),
                    validate_positive(&t.proceeds_entry, "proceeds_entry"),
                    acct_a,
                    acct_b,
                ])
            }
            TransactionWithEntries::AssetTrade(t) => collect_errors(vec![
                validate_negative(&t.outgoing_entry, "outgoing_entry"),
                validate_positive(&t.incoming_entry, "incoming_entry"),
            ]),
            TransactionWithEntries::AssetTransferIn(t) => {
                collect_errors(vec![validate_positive(&t.entry, "entry")])
            }
            TransactionWithEntries::AssetTransferOut(t) => {
                collect_errors(vec![validate_negative(&t.entry, "entry")])
            }
            TransactionWithEntries::AssetBalanceTransfer(t) => collect_errors(vec![
                validate_negative(&t.outgoing_change, "outgoing_change"),
                validate_positive(&t.incoming_change, "incoming_change"),
            ]),
            TransactionWithEntries::AccountFees(t) => {
                collect_errors(vec![validate_negative(&t.entry, "entry")])
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::view_models::accounts::base_models::account_id::RequiredAccountId;
    use crate::view_models::assets::base_models::asset_id::RequiredAssetId;
    use crate::view_models::transactions::base_models::account_asset_entry::AccountAssetEntryViewModel;
    use crate::view_models::transactions::base_models::category_id::RequiredCategoryId;
    use crate::view_models::transactions::base_models::transaction_base::TransactionBaseWithEntries;
    use crate::view_models::transactions::transaction_types::asset_purchase::AssetPurchase;
    use crate::view_models::transactions::transaction_types::asset_sale::AssetSale;
    use crate::view_models::transactions::transaction_types::cash_transfer_in::CashTransferIn;
    use crate::view_models::transactions::transaction_types::cash_transfer_out::CashTransferOut;
    use crate::view_models::transactions::transaction_types::regular_transaction::RegularTransaction;
    use crate::view_models::transactions::value_types::Amount;
    use rust_decimal_macros::dec;
    use time::OffsetDateTime;
    use uuid::Uuid;

    fn make_entry(amount: Decimal) -> AccountAssetEntryViewModel {
        make_entry_with_account(amount, Uuid::nil())
    }

    fn make_entry_with_account(amount: Decimal, account_id: Uuid) -> AccountAssetEntryViewModel {
        AccountAssetEntryViewModel {
            account_id: RequiredAccountId(account_id),
            asset_id: RequiredAssetId(1),
            amount: Amount(amount),
        }
    }

    fn make_base() -> TransactionBaseWithEntries {
        TransactionBaseWithEntries {
            date: OffsetDateTime::now_utc(),
            fees: None,
        }
    }

    // ---- CashTransferIn (positive) ----

    #[test]
    fn test_validate_cash_transfer_in_positive_succeeds() {
        let t = TransactionWithEntries::CashTransferIn(CashTransferIn {
            r#type: Default::default(),
            base: make_base(),
            entry: make_entry(dec!(100)),
        });
        assert!(t.validate().is_ok());
    }

    #[test]
    fn test_validate_cash_transfer_in_negative_fails() {
        let t = TransactionWithEntries::CashTransferIn(CashTransferIn {
            r#type: Default::default(),
            base: make_base(),
            entry: make_entry(dec!(-50)),
        });
        let err = t.validate().unwrap_err();
        match err {
            ApiError::Validation(errors) => {
                assert_eq!(errors.len(), 1);
                assert_eq!(errors[0].field, "entry.amount");
                assert_eq!(errors[0].message, "Must be a positive value.");
            }
            _ => panic!("Expected Validation error"),
        }
    }

    #[test]
    fn test_validate_cash_transfer_in_zero_fails() {
        let t = TransactionWithEntries::CashTransferIn(CashTransferIn {
            r#type: Default::default(),
            base: make_base(),
            entry: make_entry(dec!(0)),
        });
        assert!(t.validate().is_err());
    }

    // ---- CashTransferOut (negative) ----

    #[test]
    fn test_validate_cash_transfer_out_negative_succeeds() {
        let t = TransactionWithEntries::CashTransferOut(CashTransferOut {
            r#type: Default::default(),
            base: make_base(),
            entry: make_entry(dec!(-100)),
        });
        assert!(t.validate().is_ok());
    }

    #[test]
    fn test_validate_cash_transfer_out_positive_fails() {
        let t = TransactionWithEntries::CashTransferOut(CashTransferOut {
            r#type: Default::default(),
            base: make_base(),
            entry: make_entry(dec!(50)),
        });
        let err = t.validate().unwrap_err();
        match err {
            ApiError::Validation(errors) => {
                assert_eq!(errors.len(), 1);
                assert_eq!(errors[0].field, "entry.amount");
                assert_eq!(errors[0].message, "Must be a negative value.");
            }
            _ => panic!("Expected Validation error"),
        }
    }

    // ---- RegularTransaction (non-zero) ----

    #[test]
    fn test_validate_regular_transaction_positive_succeeds() {
        let t = TransactionWithEntries::RegularTransaction(RegularTransaction {
            r#type: Default::default(),
            base: make_base(),
            entry: make_entry(dec!(50)),
            category_id: RequiredCategoryId(1),
            description: None,
        });
        assert!(t.validate().is_ok());
    }

    #[test]
    fn test_validate_regular_transaction_negative_succeeds() {
        let t = TransactionWithEntries::RegularTransaction(RegularTransaction {
            r#type: Default::default(),
            base: make_base(),
            entry: make_entry(dec!(-50)),
            category_id: RequiredCategoryId(1),
            description: None,
        });
        assert!(t.validate().is_ok());
    }

    #[test]
    fn test_validate_regular_transaction_zero_fails() {
        let t = TransactionWithEntries::RegularTransaction(RegularTransaction {
            r#type: Default::default(),
            base: make_base(),
            entry: make_entry(dec!(0)),
            category_id: RequiredCategoryId(1),
            description: None,
        });
        let err = t.validate().unwrap_err();
        match err {
            ApiError::Validation(errors) => {
                assert_eq!(errors.len(), 1);
                assert_eq!(errors[0].field, "entry.amount");
                assert_eq!(errors[0].message, "Must not be zero.");
            }
            _ => panic!("Expected Validation error"),
        }
    }

    // ---- AssetPurchase (positive purchase, negative cash outgoings, same account) ----

    #[test]
    fn test_validate_asset_purchase_valid_succeeds() {
        let account_id = Uuid::new_v4();
        let t = TransactionWithEntries::AssetPurchase(AssetPurchase {
            r#type: Default::default(),
            base: make_base(),
            purchase_change: make_entry_with_account(dec!(10), account_id),
            cash_outgoings_change: make_entry_with_account(dec!(-500), account_id),
        });
        assert!(t.validate().is_ok());
    }

    #[test]
    fn test_validate_asset_purchase_wrong_signs_fails() {
        let account_id = Uuid::new_v4();
        let t = TransactionWithEntries::AssetPurchase(AssetPurchase {
            r#type: Default::default(),
            base: make_base(),
            purchase_change: make_entry_with_account(dec!(-10), account_id),
            cash_outgoings_change: make_entry_with_account(dec!(500), account_id),
        });
        let err = t.validate().unwrap_err();
        match err {
            ApiError::Validation(errors) => {
                assert_eq!(errors.len(), 2);
                assert_eq!(errors[0].field, "purchase_change.amount");
                assert_eq!(errors[1].field, "cash_outgoings_change.amount");
            }
            _ => panic!("Expected Validation error"),
        }
    }

    #[test]
    fn test_validate_asset_purchase_different_accounts_fails() {
        let t = TransactionWithEntries::AssetPurchase(AssetPurchase {
            r#type: Default::default(),
            base: make_base(),
            purchase_change: make_entry_with_account(dec!(10), Uuid::new_v4()),
            cash_outgoings_change: make_entry_with_account(dec!(-500), Uuid::new_v4()),
        });
        let err = t.validate().unwrap_err();
        match err {
            ApiError::Validation(errors) => {
                assert!(errors.iter().any(|e| e.field == "purchase_change.account_id"));
                assert!(errors
                    .iter()
                    .any(|e| e.field == "cash_outgoings_change.account_id"));
            }
            _ => panic!("Expected Validation error"),
        }
    }

    // ---- AssetSale (negative sale, positive proceeds, same account) ----

    #[test]
    fn test_validate_asset_sale_valid_succeeds() {
        let account_id = Uuid::new_v4();
        let t = TransactionWithEntries::AssetSale(AssetSale {
            r#type: Default::default(),
            base: make_base(),
            sale_entry: make_entry_with_account(dec!(-10), account_id),
            proceeds_entry: make_entry_with_account(dec!(500), account_id),
        });
        assert!(t.validate().is_ok());
    }

    #[test]
    fn test_validate_asset_sale_different_accounts_fails() {
        let t = TransactionWithEntries::AssetSale(AssetSale {
            r#type: Default::default(),
            base: make_base(),
            sale_entry: make_entry_with_account(dec!(-10), Uuid::new_v4()),
            proceeds_entry: make_entry_with_account(dec!(500), Uuid::new_v4()),
        });
        let err = t.validate().unwrap_err();
        match err {
            ApiError::Validation(errors) => {
                assert!(errors.iter().any(|e| e.field == "sale_entry.account_id"));
                assert!(errors.iter().any(|e| e.field == "proceeds_entry.account_id"));
            }
            _ => panic!("Expected Validation error"),
        }
    }
}
