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
use business::dtos::transaction_dto::{TransactionDto, TransactionTypeDto};
use paste::paste;

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use self::{
    account_fees::*, asset_balance_transfer::*, asset_dividend::*, asset_purchase::*,
    asset_sale::*, asset_trade::*, asset_transfer_in::*, asset_transfer_out::*, cash_dividend::*,
    cash_transfer_in::*, cash_transfer_out::*, regular_transaction::*,
};

macro_rules! generate_transaction_type_enums {
    ($($name:ident),*) => {

        paste! {
            #[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
            #[serde(tag = "type", rename_all = "snake_case")]
            pub enum TransactionWithEntries {
                $(
                    $name([<$name ViewModel>]),
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
            #[serde(tag = "type", rename_all = "snake_case")]
            pub enum IdentifiableTransactionWithIdentifiableEntries {
                $(
                    $name([<Identifiable $name WithIdentifiableEntriesViewModel>]),
                )*
            }

            #[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
            #[serde(tag = "type", rename_all = "snake_case")]
            pub enum MandatoryTransactionWithIdentifiableEntries {
                $(
                    $name([<Mandatory $name WithIdentifiableEntriesViewModel>]),
                )*
            }

            #[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
            #[serde(tag = "type", rename_all = "snake_case")]
            pub enum MandatoryIdentifiableTransactionWithIdentifiableEntries {
                $(
                    $name([<MandatoryIdentifiable $name WithIdentifiableEntriesViewModel>]),
                )*
            }

            #[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
            #[serde(tag = "type", rename_all = "snake_case")]
            pub enum TransactionWithIdentifiableEntries {
                $(
                    $name([<$name WithIdentifiableEntriesViewModel>]),
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

impl From<TransactionDto> for MandatoryIdentifiableTransactionWithIdentifiableEntries {
    fn from(value: TransactionDto) -> Self {
        match value.transaction_type {
            TransactionTypeDto::Regular(_) => {
                MandatoryIdentifiableTransactionWithIdentifiableEntries::RegularTransaction(
                    MandatoryIdentifiableRegularTransactionWithIdentifiableEntriesViewModel::from(
                        value,
                    ),
                )
            }
            TransactionTypeDto::AssetPurchase(_) => {
                MandatoryIdentifiableTransactionWithIdentifiableEntries::AssetPurchase(
                    MandatoryIdentifiableAssetPurchaseWithIdentifiableEntriesViewModel::from(value),
                )
            }
        }
    }
}

impl From<TransactionDto> for MandatoryTransactionWithIdentifiableEntries {
    fn from(value: TransactionDto) -> Self {
        match value.transaction_type {
            TransactionTypeDto::Regular(_) => {
                MandatoryTransactionWithIdentifiableEntries::RegularTransaction(
                    MandatoryRegularTransactionWithIdentifiableEntriesViewModel::from(value),
                )
            }
            TransactionTypeDto::AssetPurchase(_) => {
                MandatoryTransactionWithIdentifiableEntries::AssetPurchase(
                    MandatoryAssetPurchaseWithIdentifiableEntriesViewModel::from(value),
                )
            }
        }
    }
}
