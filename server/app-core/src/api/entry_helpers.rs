use rust_decimal::Decimal;
use shared::view_models::accounts::base_models::account_id::RequiredAccountId;
use shared::view_models::assets::base_models::asset_id::RequiredAssetId;
use shared::view_models::transactions::base_models::account_asset_entry::IdentifiableAccountAssetEntryViewModel;
use shared::view_models::transactions::base_models::entry_id::EntryId;
use shared::view_models::transactions::value_types::Amount;
use uuid::Uuid;

use crate::error::ApiError;
use crate::models::CreateTransactionInput;

pub fn secondary_entry(
    input: &CreateTransactionInput,
) -> Result<IdentifiableAccountAssetEntryViewModel, ApiError> {
    let account_id = input
        .secondary_account_id
        .as_deref()
        .ok_or_else(|| ApiError::Parse {
            reason: "secondary_account_id required for dual-entry transaction".into(),
        })?;
    let asset_id = input.secondary_asset_id.ok_or_else(|| ApiError::Parse {
        reason: "secondary_asset_id required for dual-entry transaction".into(),
    })?;
    let amount = input.secondary_amount.ok_or_else(|| ApiError::Parse {
        reason: "secondary_amount required for dual-entry transaction".into(),
    })?;
    entry(input.secondary_entry_id, account_id, asset_id, amount)
}

pub fn entry(
    entry_id: Option<i32>,
    account_id: &str,
    asset_id: i32,
    amount: f64,
) -> Result<IdentifiableAccountAssetEntryViewModel, ApiError> {
    let account_uuid = Uuid::parse_str(account_id).map_err(|e| ApiError::Parse {
        reason: format!("invalid account_id '{account_id}': {e}"),
    })?;
    let decimal = Decimal::try_from(amount).map_err(|e| ApiError::Parse {
        reason: format!("invalid amount {amount}: {e}"),
    })?;
    Ok(IdentifiableAccountAssetEntryViewModel {
        entry_id: EntryId(entry_id),
        entry:
            shared::view_models::transactions::base_models::account_asset_entry::TransactionEntry {
                account_id: RequiredAccountId(account_uuid),
                asset_id: RequiredAssetId(asset_id),
                amount: Amount(decimal),
            },
    })
}
