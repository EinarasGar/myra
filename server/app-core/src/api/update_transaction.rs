use shared::view_models::assets::base_models::asset_id::RequiredAssetId;
use shared::view_models::transactions::base_models::category_id::RequiredCategoryId;
use shared::view_models::transactions::base_models::description::Description;
use shared::view_models::transactions::base_models::transaction_base::TransactionBaseWithIdentifiableEntries;
use shared::view_models::transactions::transaction_types::{
    account_fees::AccountFeesWithIdentifiableEntriesViewModel,
    asset_balance_transfer::AssetBalanceTransferWithIdentifiableEntriesViewModel,
    asset_dividend::AssetDividendWithIdentifiableEntriesViewModel,
    asset_purchase::AssetPurchaseWithIdentifiableEntriesViewModel,
    asset_sale::AssetSaleWithIdentifiableEntriesViewModel,
    asset_trade::AssetTradeWithIdentifiableEntriesViewModel,
    asset_transfer_in::AssetTransferInWithIdentifiableEntriesViewModel,
    asset_transfer_out::AssetTransferOutWithIdentifiableEntriesViewModel,
    cash_dividend::CashDividendWithIdentifiableEntriesViewModel,
    cash_transfer_in::CashTransferInWithIdentifiableEntriesViewModel,
    cash_transfer_out::CashTransferOutWithIdentifiableEntriesViewModel,
    regular_transaction::RegularTransactionWithIdentifiableEntriesViewModel,
    TransactionWithIdentifiableEntries,
};
use shared::view_models::transactions::update_individual_transaction::UpdateIndividualTransactionRequestViewModel;
use time::OffsetDateTime;

use super::entry_helpers::{entry, secondary_entry};
use crate::error::ApiError;
use crate::models::CreateTransactionInput;

pub fn build_update_request_body(input: CreateTransactionInput) -> Result<String, ApiError> {
    let date = OffsetDateTime::from_unix_timestamp(input.date).map_err(|e| ApiError::Parse {
        reason: format!("invalid date: {e}"),
    })?;

    let base = TransactionBaseWithIdentifiableEntries { date, fees: None };
    let primary_entry = entry(
        input.primary_entry_id,
        &input.primary_account_id,
        input.primary_asset_id,
        input.primary_amount,
    )?;

    let transaction = match input.type_key.as_str() {
        "regular" => {
            let category_id = input.category_id.ok_or_else(|| ApiError::Parse {
                reason: "category_id required for regular transaction".into(),
            })?;
            TransactionWithIdentifiableEntries::RegularTransaction(
                RegularTransactionWithIdentifiableEntriesViewModel {
                    r#type: Default::default(),
                    base,
                    entry: primary_entry,
                    category_id: RequiredCategoryId(category_id),
                    description: input
                        .description
                        .and_then(|d| if d.trim().is_empty() { None } else { Some(d) })
                        .map(Description::from_trusted),
                },
            )
        }
        "account_fees" => TransactionWithIdentifiableEntries::AccountFees(
            AccountFeesWithIdentifiableEntriesViewModel {
                r#type: Default::default(),
                base,
                entry: primary_entry,
            },
        ),
        "cash_transfer_in" => TransactionWithIdentifiableEntries::CashTransferIn(
            CashTransferInWithIdentifiableEntriesViewModel {
                r#type: Default::default(),
                base,
                entry: primary_entry,
            },
        ),
        "cash_transfer_out" => TransactionWithIdentifiableEntries::CashTransferOut(
            CashTransferOutWithIdentifiableEntriesViewModel {
                r#type: Default::default(),
                base,
                entry: primary_entry,
            },
        ),
        "asset_transfer_in" => TransactionWithIdentifiableEntries::AssetTransferIn(
            AssetTransferInWithIdentifiableEntriesViewModel {
                r#type: Default::default(),
                base,
                entry: primary_entry,
            },
        ),
        "asset_transfer_out" => TransactionWithIdentifiableEntries::AssetTransferOut(
            AssetTransferOutWithIdentifiableEntriesViewModel {
                r#type: Default::default(),
                base,
                entry: primary_entry,
            },
        ),
        "cash_dividend" => {
            let origin_asset_id = input.origin_asset_id.ok_or_else(|| ApiError::Parse {
                reason: "origin_asset_id required for cash dividend".into(),
            })?;
            TransactionWithIdentifiableEntries::CashDividend(
                CashDividendWithIdentifiableEntriesViewModel {
                    r#type: Default::default(),
                    base,
                    entry: primary_entry,
                    origin_asset_id: RequiredAssetId(origin_asset_id),
                },
            )
        }
        "asset_dividend" => TransactionWithIdentifiableEntries::AssetDividend(
            AssetDividendWithIdentifiableEntriesViewModel {
                r#type: Default::default(),
                base,
                entry: primary_entry,
            },
        ),
        "asset_purchase" => TransactionWithIdentifiableEntries::AssetPurchase(
            AssetPurchaseWithIdentifiableEntriesViewModel {
                r#type: Default::default(),
                base,
                purchase_change: primary_entry,
                cash_outgoings_change: secondary_entry(&input)?,
            },
        ),
        "asset_sale" => TransactionWithIdentifiableEntries::AssetSale(
            AssetSaleWithIdentifiableEntriesViewModel {
                r#type: Default::default(),
                base,
                sale_entry: primary_entry,
                proceeds_entry: secondary_entry(&input)?,
            },
        ),
        "asset_trade" => TransactionWithIdentifiableEntries::AssetTrade(
            AssetTradeWithIdentifiableEntriesViewModel {
                r#type: Default::default(),
                base,
                outgoing_entry: primary_entry,
                incoming_entry: secondary_entry(&input)?,
            },
        ),
        "asset_balance_transfer" => TransactionWithIdentifiableEntries::AssetBalanceTransfer(
            AssetBalanceTransferWithIdentifiableEntriesViewModel {
                r#type: Default::default(),
                base,
                outgoing_change: primary_entry,
                incoming_change: secondary_entry(&input)?,
            },
        ),
        other => {
            return Err(ApiError::Parse {
                reason: format!("unknown transaction type '{other}'"),
            });
        }
    };

    serde_json::to_string(&UpdateIndividualTransactionRequestViewModel { transaction }).map_err(
        |e| ApiError::Parse {
            reason: e.to_string(),
        },
    )
}
