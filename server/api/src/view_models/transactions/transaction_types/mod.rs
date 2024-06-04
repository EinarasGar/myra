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

impl From<TransactionWithEntries> for TransactionDto {
    fn from(value: TransactionWithEntries) -> Self {
        match value {
            TransactionWithEntries::RegularTransaction(t) => t.into(),
            TransactionWithEntries::CashTransferOut(_) => todo!(),
            TransactionWithEntries::CashTransferIn(_) => todo!(),
            TransactionWithEntries::CashDividend(_) => todo!(),
            TransactionWithEntries::AssetTransferOut(_) => todo!(),
            TransactionWithEntries::AssetTransferIn(_) => todo!(),
            TransactionWithEntries::AssetTrade(_) => todo!(),
            TransactionWithEntries::AssetSale(_) => todo!(),
            TransactionWithEntries::AssetPurchase(_) => todo!(),
            TransactionWithEntries::AssetDividend(_) => todo!(),
            TransactionWithEntries::AssetBalanceTransfer(_) => todo!(),
            TransactionWithEntries::AccountFees(_) => todo!(),
        }
    }
}

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
            TransactionTypeDto::AssetPurchase => todo!(),
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
            TransactionTypeDto::AssetPurchase => todo!(),
        }
    }
}
