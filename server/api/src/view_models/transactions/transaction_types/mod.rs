pub mod account_fees;
pub mod asset_balance_transfer;
pub mod asset_dividend;
pub mod asset_purchase;
pub mod asset_sale;
pub mod asset_trade;
pub mod asset_transfer_in;
pub mod asset_transfer_out;
pub mod cash_dividend;
pub mod cash_transfer_in;
pub mod cash_transfer_out;
pub mod regular_transaction;
use crate::view_models::transactions::base_models::account_asset_entry::IdentifiableAccountAssetEntry;
use crate::view_models::transactions::base_models::entry_id::{EntryId, RequiredEntryId};
use crate::view_models::transactions::base_models::transaction_fee::TransactionFee;
use crate::view_models::transactions::base_models::transaction_id::{
    RequiredTransactionId, TransactionId,
};
use business::dtos::transaction_dto::{TransactionDto, TransactionTypeDto};
use paste::paste;

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::view_models::transactions::base_models::account_asset_entry::{
    AccountAssetEntryViewModel, RequiredIdentifiableAccountAssetEntryViewModel,
};
use crate::view_models::transactions::base_models::transaction_base::{
    IdentifiableTransactionBase, TransactionBase,
};

use self::{
    account_fees::*, asset_balance_transfer::*, asset_dividend::*, asset_purchase::*,
    asset_sale::*, asset_trade::*, asset_transfer_in::*, asset_transfer_out::*, cash_dividend::*,
    cash_transfer_in::*, cash_transfer_out::*, regular_transaction::*,
};

macro_rules! generate_transaction_type_enums {
    ($($name:ident),*) => {

        paste! {
            #[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
            #[serde(rename_all = "snake_case", untagged)]
            #[schema(discriminator = "type")]
            pub enum TransactionWithEntries {
                $(
                    $name(
                        [<$name>]<
                            TransactionBase<TransactionFee<AccountAssetEntryViewModel>>,
                            AccountAssetEntryViewModel,
                        >
                    ),
                )*
            }

            impl From<TransactionWithEntries> for TransactionDto {
                fn from(value: TransactionWithEntries) -> Self {
                    match value {
                        $(
                            TransactionWithEntries::$name(t) => t.into(),
                        )*
                    }
                }
            }

            #[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
            #[serde(rename_all = "snake_case", untagged)]
            #[schema(discriminator = "type")]
            pub enum IdentifiableTransactionWithIdentifiableEntries {
                $(
                    $name(
                        [<$name>]<
                            IdentifiableTransactionBase<
                                TransactionBase<TransactionFee<IdentifiableAccountAssetEntry<EntryId>>>,
                                TransactionId,
                            >,
                            IdentifiableAccountAssetEntry<EntryId>,
                        >,
                    ),
                )*
            }

            #[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
            #[serde(rename_all = "snake_case", untagged)]
            #[schema(discriminator = "type")]
            pub enum RequiredTransactionWithIdentifiableEntries {
                $(
                    $name(
                        [<$name>]<
                            TransactionBase<TransactionFee<IdentifiableAccountAssetEntry<EntryId>>>,
                            IdentifiableAccountAssetEntry<RequiredEntryId>,
                        >,
                    ),
                )*
            }

            #[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
            #[serde(rename_all = "snake_case", untagged)]
            #[schema(discriminator = "type")]
            pub enum RequiredIdentifiableTransactionWithIdentifiableEntries {
                $(
                    $name(
                        [<$name>]<
                            IdentifiableTransactionBase<
                                TransactionBase<TransactionFee<IdentifiableAccountAssetEntry<RequiredEntryId>>>,
                                RequiredTransactionId,
                            >,
                            RequiredIdentifiableAccountAssetEntryViewModel,
                        >
                    ),
                )*
            }

            #[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
            #[serde(rename_all = "snake_case", untagged)]
            #[schema(discriminator = "type")]
            pub enum TransactionWithIdentifiableEntries {
                $(
                    $name(
                        [<$name>]<
                            TransactionBase<TransactionFee<IdentifiableAccountAssetEntry<EntryId>>>,
                            IdentifiableAccountAssetEntry<EntryId>,
                        >,
                    ),
                )*
            }
        }
    };
}

generate_transaction_type_enums!(
    RegularTransaction,
    CashTransferOut,
    CashTransferIn,
    CashDividend,
    AssetTransferOut,
    AssetTransferIn,
    AssetTrade,
    AssetSale,
    AssetPurchase,
    AssetDividend,
    AssetBalanceTransfer,
    AccountFees
);

impl From<TransactionDto> for RequiredIdentifiableTransactionWithIdentifiableEntries {
    fn from(value: TransactionDto) -> Self {
        match value.transaction_type {
            TransactionTypeDto::Regular(_) => {
                RequiredIdentifiableTransactionWithIdentifiableEntries::RegularTransaction(
                    RequiredIdentifiableRegularTransactionWithIdentifiableEntriesViewModel::from(
                        value,
                    ),
                )
            }
            TransactionTypeDto::AssetPurchase(_) => {
                RequiredIdentifiableTransactionWithIdentifiableEntries::AssetPurchase(
                    RequiredIdentifiableAssetPurchaseWithIdentifiableEntriesViewModel::from(value),
                )
            }
            TransactionTypeDto::AssetSale(_) => {
                RequiredIdentifiableTransactionWithIdentifiableEntries::AssetSale(
                    RequiredIdentifiableAssetSaleWithIdentifiableEntriesViewModel::from(value),
                )
            }
            TransactionTypeDto::CashTransferIn(_) => {
                RequiredIdentifiableTransactionWithIdentifiableEntries::CashTransferIn(
                    RequiredIdentifiableCashTransferInWithIdentifiableEntriesViewModel::from(value),
                )
            }
            TransactionTypeDto::CashTransferOut(_) => {
                RequiredIdentifiableTransactionWithIdentifiableEntries::CashTransferOut(
                    RequiredIdentifiableCashTransferOutWithIdentifiableEntriesViewModel::from(value),
                )
            }
            TransactionTypeDto::CashDividend(_) => {
                RequiredIdentifiableTransactionWithIdentifiableEntries::CashDividend(
                    RequiredIdentifiableCashDividendWithIdentifiableEntriesViewModel::from(value),
                )
            }
            TransactionTypeDto::AssetDividend(_) => {
                RequiredIdentifiableTransactionWithIdentifiableEntries::AssetDividend(
                    RequiredIdentifiableAssetDividendWithIdentifiableEntriesViewModel::from(value),
                )
            }
        }
    }
}

impl From<TransactionDto> for RequiredTransactionWithIdentifiableEntries {
    fn from(value: TransactionDto) -> Self {
        match value.transaction_type {
            TransactionTypeDto::Regular(_) => {
                RequiredTransactionWithIdentifiableEntries::RegularTransaction(
                    RequiredRegularTransactionWithIdentifiableEntriesViewModel::from(value),
                )
            }
            TransactionTypeDto::AssetPurchase(_) => {
                RequiredTransactionWithIdentifiableEntries::AssetPurchase(
                    RequiredAssetPurchaseWithIdentifiableEntriesViewModel::from(value),
                )
            }
            TransactionTypeDto::AssetSale(_) => {
                RequiredTransactionWithIdentifiableEntries::AssetSale(
                    RequiredAssetSaleWithIdentifiableEntriesViewModel::from(value),
                )
            }
            TransactionTypeDto::CashTransferIn(_) => {
                RequiredTransactionWithIdentifiableEntries::CashTransferIn(
                    RequiredCashTransferInWithIdentifiableEntriesViewModel::from(value),
                )
            }
            TransactionTypeDto::CashTransferOut(_) => {
                RequiredTransactionWithIdentifiableEntries::CashTransferOut(
                    RequiredCashTransferOutWithIdentifiableEntriesViewModel::from(value),
                )
            }
            TransactionTypeDto::CashDividend(_) => {
                RequiredTransactionWithIdentifiableEntries::CashDividend(
                    RequiredCashDividendWithIdentifiableEntriesViewModel::from(value),
                )
            }
            TransactionTypeDto::AssetDividend(_) => {
                RequiredTransactionWithIdentifiableEntries::AssetDividend(
                    RequiredAssetDividendWithIdentifiableEntriesViewModel::from(value),
                )
            }
        }
    }
}
