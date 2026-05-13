use shared::view_models::assets::base_models::asset_id::RequiredAssetId;
use shared::view_models::transactions::base_models::category_id::RequiredCategoryId;
use shared::view_models::transactions::base_models::description::Description;
use shared::view_models::transactions::base_models::transaction_base::{
    IdentifiableTransactionBaseWithIdentifiableEntries, TransactionBaseWithIdentifiableEntries,
};
use shared::view_models::transactions::base_models::transaction_group::TransactionGroupWithEntryIds;
use shared::view_models::transactions::base_models::transaction_id::TransactionId;
use shared::view_models::transactions::transaction_types::{
    account_fees::IdentifiableAccountFeesWithIdentifiableEntriesViewModel,
    asset_balance_transfer::IdentifiableAssetBalanceTransferWithIdentifiableEntriesViewModel,
    asset_dividend::IdentifiableAssetDividendWithIdentifiableEntriesViewModel,
    asset_purchase::IdentifiableAssetPurchaseWithIdentifiableEntriesViewModel,
    asset_sale::IdentifiableAssetSaleWithIdentifiableEntriesViewModel,
    asset_trade::IdentifiableAssetTradeWithIdentifiableEntriesViewModel,
    asset_transfer_in::IdentifiableAssetTransferInWithIdentifiableEntriesViewModel,
    asset_transfer_out::IdentifiableAssetTransferOutWithIdentifiableEntriesViewModel,
    cash_dividend::IdentifiableCashDividendWithIdentifiableEntriesViewModel,
    cash_transfer_in::IdentifiableCashTransferInWithIdentifiableEntriesViewModel,
    cash_transfer_out::IdentifiableCashTransferOutWithIdentifiableEntriesViewModel,
    regular_transaction::IdentifiableRegularTransactionWithIdentifiableEntriesViewModel,
    IdentifiableTransactionWithIdentifiableEntries,
};
use shared::view_models::transactions::update_transaction_group::UpdateTransactionGroupRequestViewModel;
use time::OffsetDateTime;
use uuid::Uuid;

use super::entry_helpers::{entry, secondary_entry};
use crate::error::ApiError;
use crate::models::{CreateTransactionGroupInput, CreateTransactionInput};

pub fn build_update_group_request_body(
    input: CreateTransactionGroupInput,
) -> Result<String, ApiError> {
    let group_date =
        OffsetDateTime::from_unix_timestamp(input.date).map_err(|e| ApiError::Parse {
            reason: format!("invalid date: {e}"),
        })?;

    let mut transactions: Vec<IdentifiableTransactionWithIdentifiableEntries> =
        Vec::with_capacity(input.transactions.len());

    for mut child in input.transactions {
        if child.category_id.is_none() && child.type_key == "regular" {
            child.category_id = Some(input.category_id);
        }
        transactions.push(build_child(child)?);
    }

    let request = UpdateTransactionGroupRequestViewModel {
        group: TransactionGroupWithEntryIds {
            transactions,
            description: Description::from_trusted(input.description),
            category_id: RequiredCategoryId(input.category_id),
            date: group_date,
        },
    };

    serde_json::to_string(&request).map_err(|e| ApiError::Parse {
        reason: e.to_string(),
    })
}

fn build_child(
    input: CreateTransactionInput,
) -> Result<IdentifiableTransactionWithIdentifiableEntries, ApiError> {
    let date = OffsetDateTime::from_unix_timestamp(input.date).map_err(|e| ApiError::Parse {
        reason: format!("invalid date: {e}"),
    })?;

    let transaction_id = input
        .transaction_id
        .as_deref()
        .map(|id| Uuid::parse_str(id))
        .transpose()
        .map_err(|e| ApiError::Parse {
            reason: format!("invalid transaction_id: {e}"),
        })?;

    let base_inner = TransactionBaseWithIdentifiableEntries { date, fees: None };
    let base = IdentifiableTransactionBaseWithIdentifiableEntries {
        transaction_id: TransactionId(transaction_id),
        base: base_inner,
    };

    let primary = entry(
        input.primary_entry_id,
        &input.primary_account_id,
        input.primary_asset_id,
        input.primary_amount,
    )?;

    let tx = match input.type_key.as_str() {
        "regular" => {
            let category_id = input.category_id.ok_or_else(|| ApiError::Parse {
                reason: "category_id required for regular transaction".into(),
            })?;
            IdentifiableTransactionWithIdentifiableEntries::RegularTransaction(
                IdentifiableRegularTransactionWithIdentifiableEntriesViewModel {
                    r#type: Default::default(),
                    base,
                    entry: primary,
                    category_id: RequiredCategoryId(category_id),
                    description: input
                        .description
                        .and_then(|d| if d.trim().is_empty() { None } else { Some(d) })
                        .map(Description::from_trusted),
                },
            )
        }
        "account_fees" => IdentifiableTransactionWithIdentifiableEntries::AccountFees(
            IdentifiableAccountFeesWithIdentifiableEntriesViewModel {
                r#type: Default::default(),
                base,
                entry: primary,
            },
        ),
        "cash_transfer_in" => IdentifiableTransactionWithIdentifiableEntries::CashTransferIn(
            IdentifiableCashTransferInWithIdentifiableEntriesViewModel {
                r#type: Default::default(),
                base,
                entry: primary,
            },
        ),
        "cash_transfer_out" => IdentifiableTransactionWithIdentifiableEntries::CashTransferOut(
            IdentifiableCashTransferOutWithIdentifiableEntriesViewModel {
                r#type: Default::default(),
                base,
                entry: primary,
            },
        ),
        "asset_transfer_in" => IdentifiableTransactionWithIdentifiableEntries::AssetTransferIn(
            IdentifiableAssetTransferInWithIdentifiableEntriesViewModel {
                r#type: Default::default(),
                base,
                entry: primary,
            },
        ),
        "asset_transfer_out" => IdentifiableTransactionWithIdentifiableEntries::AssetTransferOut(
            IdentifiableAssetTransferOutWithIdentifiableEntriesViewModel {
                r#type: Default::default(),
                base,
                entry: primary,
            },
        ),
        "cash_dividend" => {
            let origin_asset_id = input.origin_asset_id.ok_or_else(|| ApiError::Parse {
                reason: "origin_asset_id required for cash dividend".into(),
            })?;
            IdentifiableTransactionWithIdentifiableEntries::CashDividend(
                IdentifiableCashDividendWithIdentifiableEntriesViewModel {
                    r#type: Default::default(),
                    base,
                    entry: primary,
                    origin_asset_id: RequiredAssetId(origin_asset_id),
                },
            )
        }
        "asset_dividend" => IdentifiableTransactionWithIdentifiableEntries::AssetDividend(
            IdentifiableAssetDividendWithIdentifiableEntriesViewModel {
                r#type: Default::default(),
                base,
                entry: primary,
            },
        ),
        "asset_purchase" => IdentifiableTransactionWithIdentifiableEntries::AssetPurchase(
            IdentifiableAssetPurchaseWithIdentifiableEntriesViewModel {
                r#type: Default::default(),
                base,
                purchase_change: primary,
                cash_outgoings_change: secondary_entry(&input)?,
            },
        ),
        "asset_sale" => IdentifiableTransactionWithIdentifiableEntries::AssetSale(
            IdentifiableAssetSaleWithIdentifiableEntriesViewModel {
                r#type: Default::default(),
                base,
                sale_entry: primary,
                proceeds_entry: secondary_entry(&input)?,
            },
        ),
        "asset_trade" => IdentifiableTransactionWithIdentifiableEntries::AssetTrade(
            IdentifiableAssetTradeWithIdentifiableEntriesViewModel {
                r#type: Default::default(),
                base,
                outgoing_entry: primary,
                incoming_entry: secondary_entry(&input)?,
            },
        ),
        "asset_balance_transfer" => {
            IdentifiableTransactionWithIdentifiableEntries::AssetBalanceTransfer(
                IdentifiableAssetBalanceTransferWithIdentifiableEntriesViewModel {
                    r#type: Default::default(),
                    base,
                    outgoing_change: primary,
                    incoming_change: secondary_entry(&input)?,
                },
            )
        }
        other => {
            return Err(ApiError::Parse {
                reason: format!("unknown transaction type '{other}'"),
            });
        }
    };

    Ok(tx)
}
