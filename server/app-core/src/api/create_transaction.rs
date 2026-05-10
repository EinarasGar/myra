use rust_decimal::Decimal;
use shared::view_models::accounts::base_models::account_id::RequiredAccountId;
use shared::view_models::assets::base_models::asset_id::RequiredAssetId;
use shared::view_models::transactions::add_individual_transaction::AddIndividualTransactionRequestViewModel;
use shared::view_models::transactions::base_models::account_asset_entry::AccountAssetEntryViewModel;
use shared::view_models::transactions::base_models::category_id::RequiredCategoryId;
use shared::view_models::transactions::base_models::description::Description;
use shared::view_models::transactions::base_models::transaction_base::TransactionBaseWithEntries;
use shared::view_models::transactions::transaction_types::{
    account_fees::AccountFeesInputViewModel,
    asset_balance_transfer::AssetBalanceTransferInputViewModel,
    asset_dividend::AssetDividendInputViewModel, asset_purchase::AssetPurchaseInputViewModel,
    asset_sale::AssetSaleInputViewModel, asset_trade::AssetTradeInputViewModel,
    asset_transfer_in::AssetTransferInInputViewModel,
    asset_transfer_out::AssetTransferOutInputViewModel, cash_dividend::CashDividendInputViewModel,
    cash_transfer_in::CashTransferInInputViewModel,
    cash_transfer_out::CashTransferOutInputViewModel,
    regular_transaction::RegularTransactionInputViewModel, TransactionWithEntries,
};
use shared::view_models::transactions::value_types::Amount;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::error::ApiError;
use crate::models::CreateTransactionInput;

pub fn build_request_body(input: CreateTransactionInput) -> Result<String, ApiError> {
    let transaction = build_transaction(input)?;
    let request = AddIndividualTransactionRequestViewModel { transaction };
    serde_json::to_string(&request).map_err(|e| ApiError::Parse {
        reason: e.to_string(),
    })
}

pub fn build_transaction(
    input: CreateTransactionInput,
) -> Result<TransactionWithEntries, ApiError> {
    let date = OffsetDateTime::from_unix_timestamp(input.date).map_err(|e| ApiError::Parse {
        reason: format!("invalid date: {e}"),
    })?;

    let base = TransactionBaseWithEntries { date, fees: None };

    let primary_entry = entry(
        &input.primary_account_id,
        input.primary_asset_id,
        input.primary_amount,
    )?;

    let transaction = match input.type_key.as_str() {
        "regular" => {
            let category_id = input.category_id.ok_or_else(|| ApiError::Parse {
                reason: "category_id required for regular transaction".into(),
            })?;
            TransactionWithEntries::RegularTransaction(RegularTransactionInputViewModel {
                r#type: Default::default(),
                base,
                entry: primary_entry,
                category_id: RequiredCategoryId(category_id),
                description: input
                    .description
                    .and_then(|d| if d.trim().is_empty() { None } else { Some(d) })
                    .map(Description::from_trusted),
            })
        }
        "account_fees" => TransactionWithEntries::AccountFees(AccountFeesInputViewModel {
            r#type: Default::default(),
            base,
            entry: primary_entry,
        }),
        "cash_transfer_in" => {
            TransactionWithEntries::CashTransferIn(CashTransferInInputViewModel {
                r#type: Default::default(),
                base,
                entry: primary_entry,
            })
        }
        "cash_transfer_out" => {
            TransactionWithEntries::CashTransferOut(CashTransferOutInputViewModel {
                r#type: Default::default(),
                base,
                entry: primary_entry,
            })
        }
        "asset_transfer_in" => {
            TransactionWithEntries::AssetTransferIn(AssetTransferInInputViewModel {
                r#type: Default::default(),
                base,
                entry: primary_entry,
            })
        }
        "asset_transfer_out" => {
            TransactionWithEntries::AssetTransferOut(AssetTransferOutInputViewModel {
                r#type: Default::default(),
                base,
                entry: primary_entry,
            })
        }
        "cash_dividend" => {
            let origin_asset_id = input.origin_asset_id.ok_or_else(|| ApiError::Parse {
                reason: "origin_asset_id required for cash dividend".into(),
            })?;
            TransactionWithEntries::CashDividend(CashDividendInputViewModel {
                r#type: Default::default(),
                base,
                entry: primary_entry,
                origin_asset_id: RequiredAssetId(origin_asset_id),
            })
        }
        "asset_dividend" => TransactionWithEntries::AssetDividend(AssetDividendInputViewModel {
            r#type: Default::default(),
            base,
            entry: primary_entry,
        }),
        "asset_purchase" => {
            let secondary = secondary_entry(&input)?;
            TransactionWithEntries::AssetPurchase(AssetPurchaseInputViewModel {
                r#type: Default::default(),
                base,
                purchase_change: primary_entry,
                cash_outgoings_change: secondary,
            })
        }
        "asset_sale" => {
            let secondary = secondary_entry(&input)?;
            TransactionWithEntries::AssetSale(AssetSaleInputViewModel {
                r#type: Default::default(),
                base,
                sale_entry: primary_entry,
                proceeds_entry: secondary,
            })
        }
        "asset_trade" => {
            let secondary = secondary_entry(&input)?;
            TransactionWithEntries::AssetTrade(AssetTradeInputViewModel {
                r#type: Default::default(),
                base,
                outgoing_entry: primary_entry,
                incoming_entry: secondary,
            })
        }
        "asset_balance_transfer" => {
            let secondary = secondary_entry(&input)?;
            TransactionWithEntries::AssetBalanceTransfer(AssetBalanceTransferInputViewModel {
                r#type: Default::default(),
                base,
                outgoing_change: primary_entry,
                incoming_change: secondary,
            })
        }
        other => {
            return Err(ApiError::Parse {
                reason: format!("unknown transaction type '{other}'"),
            });
        }
    };

    Ok(transaction)
}

fn secondary_entry(input: &CreateTransactionInput) -> Result<AccountAssetEntryViewModel, ApiError> {
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
    entry(account_id, asset_id, amount)
}

fn entry(
    account_id: &str,
    asset_id: i32,
    amount: f64,
) -> Result<AccountAssetEntryViewModel, ApiError> {
    let account_uuid = Uuid::parse_str(account_id).map_err(|e| ApiError::Parse {
        reason: format!("invalid account_id '{account_id}': {e}"),
    })?;
    let decimal = Decimal::try_from(amount).map_err(|e| ApiError::Parse {
        reason: format!("invalid amount {amount}: {e}"),
    })?;
    Ok(AccountAssetEntryViewModel {
        account_id: RequiredAccountId(account_uuid),
        asset_id: RequiredAssetId(asset_id),
        amount: Amount(decimal),
    })
}
