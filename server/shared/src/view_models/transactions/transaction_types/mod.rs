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
#[cfg(feature = "backend")]
use business::dtos::transaction_dto::{TransactionDto, TransactionTypeDto};
use paste::paste;

#[cfg(feature = "backend")]
use business::dtos::fee_entry_dto::FeeEntryDto;
use serde::{Deserialize, Serialize};
#[cfg(feature = "backend")]
use time::OffsetDateTime;
#[cfg(feature = "backend")]
use uuid::Uuid;

#[cfg(feature = "backend")]
use crate::view_models::transactions::base_models::transaction_base::{
    IdentifiableTransactionBaseWithIdentifiableEntries, TransactionBaseWithIdentifiableEntries,
};

#[cfg(feature = "backend")]
use business::dtos::transaction_dto::{
    AccountFeesMetadataDto, AssetBalanceTransferMetadataDto, AssetDividendMetadataDto,
    AssetPurchaseMetadataDto, AssetSaleMetadataDto, AssetTradeMetadataDto,
    AssetTransferInMetadataDto, AssetTransferOutMetadataDto, CashDividendMetadataDto,
    CashTransferInMetadataDto, CashTransferOutMetadataDto, RegularTransactionMetadataDto,
};

use self::{
    account_fees::*, asset_balance_transfer::*, asset_dividend::*, asset_purchase::*,
    asset_sale::*, asset_trade::*, asset_transfer_in::*, asset_transfer_out::*, cash_dividend::*,
    cash_transfer_in::*, cash_transfer_out::*, regular_transaction::*,
};

macro_rules! generate_transaction_type_enums {
    ($($name:ident),*) => {

        paste! {
            #[derive(Clone, Debug, Serialize, Deserialize)]
#[derive(utoipa::ToSchema)]
            #[serde(rename_all = "snake_case", untagged)]
            #[schema(discriminator = "type")]
            pub enum TransactionWithEntries {
                $(
                    $name([<$name InputViewModel>]),
                )*
            }

#[cfg(feature = "backend")]
            impl From<TransactionWithEntries> for TransactionDto {
                fn from(value: TransactionWithEntries) -> Self {
                    match value {
                        $(
                            TransactionWithEntries::$name(t) => t.into(),
                        )*
                    }
                }
            }

            #[derive(Clone, Debug, Serialize, Deserialize)]
#[derive(utoipa::ToSchema)]
            #[serde(rename_all = "snake_case", untagged)]
            #[schema(discriminator = "type")]
            pub enum IdentifiableTransactionWithIdentifiableEntries {
                $(
                    $name([<Identifiable $name WithIdentifiableEntriesViewModel>]),
                )*
            }

            #[derive(Clone, Debug, Serialize, Deserialize)]
#[derive(utoipa::ToSchema)]
            #[serde(rename_all = "snake_case", untagged)]
            #[schema(discriminator = "type")]
            pub enum RequiredTransactionWithIdentifiableEntries {
                $(
                    $name([<Required $name WithIdentifiableEntriesViewModel>]),
                )*
            }

            #[derive(Clone, Debug, Serialize, Deserialize)]
#[derive(utoipa::ToSchema)]
            #[serde(rename_all = "snake_case", untagged)]
            #[schema(discriminator = "type")]
            pub enum RequiredIdentifiableTransactionWithIdentifiableEntries {
                $(
                    $name([<Required Identifiable $name WithIdentifiableEntriesViewModel>]),
                )*
            }

            #[derive(Clone, Debug, Serialize, Deserialize)]
#[derive(utoipa::ToSchema)]
            #[serde(rename_all = "snake_case", untagged)]
            #[schema(discriminator = "type")]
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

pub type TransactionInput = TransactionWithEntries;
pub type TransactionWithId = IdentifiableTransactionWithIdentifiableEntries;
pub type RequiredTransactionWithId = RequiredIdentifiableTransactionWithIdentifiableEntries;

#[cfg(feature = "backend")]
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
                    RequiredIdentifiableCashTransferOutWithIdentifiableEntriesViewModel::from(
                        value,
                    ),
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
            TransactionTypeDto::AssetTransferOut(_) => {
                RequiredIdentifiableTransactionWithIdentifiableEntries::AssetTransferOut(
                    RequiredIdentifiableAssetTransferOutWithIdentifiableEntriesViewModel::from(
                        value,
                    ),
                )
            }
            TransactionTypeDto::AssetTransferIn(_) => {
                RequiredIdentifiableTransactionWithIdentifiableEntries::AssetTransferIn(
                    RequiredIdentifiableAssetTransferInWithIdentifiableEntriesViewModel::from(
                        value,
                    ),
                )
            }
            TransactionTypeDto::AssetTrade(_) => {
                RequiredIdentifiableTransactionWithIdentifiableEntries::AssetTrade(
                    RequiredIdentifiableAssetTradeWithIdentifiableEntriesViewModel::from(value),
                )
            }
            TransactionTypeDto::AssetBalanceTransfer(_) => {
                RequiredIdentifiableTransactionWithIdentifiableEntries::AssetBalanceTransfer(
                    RequiredIdentifiableAssetBalanceTransferWithIdentifiableEntriesViewModel::from(
                        value,
                    ),
                )
            }
            TransactionTypeDto::AccountFees(_) => {
                RequiredIdentifiableTransactionWithIdentifiableEntries::AccountFees(
                    RequiredIdentifiableAccountFeesWithIdentifiableEntriesViewModel::from(value),
                )
            }
        }
    }
}

#[cfg(feature = "backend")]
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
            TransactionTypeDto::AssetTransferOut(_) => {
                RequiredTransactionWithIdentifiableEntries::AssetTransferOut(
                    RequiredAssetTransferOutWithIdentifiableEntriesViewModel::from(value),
                )
            }
            TransactionTypeDto::AssetTransferIn(_) => {
                RequiredTransactionWithIdentifiableEntries::AssetTransferIn(
                    RequiredAssetTransferInWithIdentifiableEntriesViewModel::from(value),
                )
            }
            TransactionTypeDto::AssetTrade(_) => {
                RequiredTransactionWithIdentifiableEntries::AssetTrade(
                    RequiredAssetTradeWithIdentifiableEntriesViewModel::from(value),
                )
            }
            TransactionTypeDto::AssetBalanceTransfer(_) => {
                RequiredTransactionWithIdentifiableEntries::AssetBalanceTransfer(
                    RequiredAssetBalanceTransferWithIdentifiableEntriesViewModel::from(value),
                )
            }
            TransactionTypeDto::AccountFees(_) => {
                RequiredTransactionWithIdentifiableEntries::AccountFees(
                    RequiredAccountFeesWithIdentifiableEntriesViewModel::from(value),
                )
            }
        }
    }
}

#[cfg(feature = "backend")]
fn extract_base_no_id(
    base: TransactionBaseWithIdentifiableEntries,
) -> (OffsetDateTime, Vec<FeeEntryDto>) {
    (
        base.date,
        base.fees
            .map(|f| f.into_iter().map(Into::into).collect())
            .unwrap_or_default(),
    )
}

#[cfg(feature = "backend")]
fn extract_identifiable_base(
    base: IdentifiableTransactionBaseWithIdentifiableEntries,
) -> (Option<Uuid>, OffsetDateTime, Vec<FeeEntryDto>) {
    (
        base.transaction_id.0,
        base.base.date,
        base.base
            .fees
            .map(|f| f.into_iter().map(Into::into).collect())
            .unwrap_or_default(),
    )
}

#[cfg(feature = "backend")]
impl From<IdentifiableTransactionWithIdentifiableEntries> for TransactionDto {
    fn from(value: IdentifiableTransactionWithIdentifiableEntries) -> Self {
        match value {
            IdentifiableTransactionWithIdentifiableEntries::RegularTransaction(t) => {
                let (transaction_id, date, fee_entries) = extract_identifiable_base(t.base);
                TransactionDto {
                    transaction_id,
                    date,
                    fee_entries,
                    transaction_type: TransactionTypeDto::Regular(RegularTransactionMetadataDto {
                        description: t.description.map(|d| d.into_inner()),
                        entry: t.entry.into(),
                        category_id: t.category_id.0,
                    }),
                }
            }
            IdentifiableTransactionWithIdentifiableEntries::CashTransferOut(t) => {
                let (transaction_id, date, fee_entries) = extract_identifiable_base(t.base);
                TransactionDto {
                    transaction_id,
                    date,
                    fee_entries,
                    transaction_type: TransactionTypeDto::CashTransferOut(
                        CashTransferOutMetadataDto {
                            entry: t.entry.into(),
                        },
                    ),
                }
            }
            IdentifiableTransactionWithIdentifiableEntries::CashTransferIn(t) => {
                let (transaction_id, date, fee_entries) = extract_identifiable_base(t.base);
                TransactionDto {
                    transaction_id,
                    date,
                    fee_entries,
                    transaction_type: TransactionTypeDto::CashTransferIn(
                        CashTransferInMetadataDto {
                            entry: t.entry.into(),
                        },
                    ),
                }
            }
            IdentifiableTransactionWithIdentifiableEntries::CashDividend(t) => {
                let (transaction_id, date, fee_entries) = extract_identifiable_base(t.base);
                TransactionDto {
                    transaction_id,
                    date,
                    fee_entries,
                    transaction_type: TransactionTypeDto::CashDividend(CashDividendMetadataDto {
                        entry: t.entry.into(),
                        origin_asset_id: t.origin_asset_id.0,
                    }),
                }
            }
            IdentifiableTransactionWithIdentifiableEntries::AssetPurchase(t) => {
                let (transaction_id, date, fee_entries) = extract_identifiable_base(t.base);
                TransactionDto {
                    transaction_id,
                    date,
                    fee_entries,
                    transaction_type: TransactionTypeDto::AssetPurchase(AssetPurchaseMetadataDto {
                        purchase: t.purchase_change.into(),
                        sale: t.cash_outgoings_change.into(),
                    }),
                }
            }
            IdentifiableTransactionWithIdentifiableEntries::AssetSale(t) => {
                let (transaction_id, date, fee_entries) = extract_identifiable_base(t.base);
                TransactionDto {
                    transaction_id,
                    date,
                    fee_entries,
                    transaction_type: TransactionTypeDto::AssetSale(AssetSaleMetadataDto {
                        sale: t.sale_entry.into(),
                        proceeds: t.proceeds_entry.into(),
                    }),
                }
            }
            IdentifiableTransactionWithIdentifiableEntries::AssetTrade(t) => {
                let (transaction_id, date, fee_entries) = extract_identifiable_base(t.base);
                TransactionDto {
                    transaction_id,
                    date,
                    fee_entries,
                    transaction_type: TransactionTypeDto::AssetTrade(AssetTradeMetadataDto {
                        outgoing_entry: t.outgoing_entry.into(),
                        incoming_entry: t.incoming_entry.into(),
                    }),
                }
            }
            IdentifiableTransactionWithIdentifiableEntries::AssetTransferIn(t) => {
                let (transaction_id, date, fee_entries) = extract_identifiable_base(t.base);
                TransactionDto {
                    transaction_id,
                    date,
                    fee_entries,
                    transaction_type: TransactionTypeDto::AssetTransferIn(
                        AssetTransferInMetadataDto {
                            entry: t.entry.into(),
                        },
                    ),
                }
            }
            IdentifiableTransactionWithIdentifiableEntries::AssetTransferOut(t) => {
                let (transaction_id, date, fee_entries) = extract_identifiable_base(t.base);
                TransactionDto {
                    transaction_id,
                    date,
                    fee_entries,
                    transaction_type: TransactionTypeDto::AssetTransferOut(
                        AssetTransferOutMetadataDto {
                            entry: t.entry.into(),
                        },
                    ),
                }
            }
            IdentifiableTransactionWithIdentifiableEntries::AssetDividend(t) => {
                let (transaction_id, date, fee_entries) = extract_identifiable_base(t.base);
                TransactionDto {
                    transaction_id,
                    date,
                    fee_entries,
                    transaction_type: TransactionTypeDto::AssetDividend(AssetDividendMetadataDto {
                        entry: t.entry.into(),
                    }),
                }
            }
            IdentifiableTransactionWithIdentifiableEntries::AssetBalanceTransfer(t) => {
                let (transaction_id, date, fee_entries) = extract_identifiable_base(t.base);
                TransactionDto {
                    transaction_id,
                    date,
                    fee_entries,
                    transaction_type: TransactionTypeDto::AssetBalanceTransfer(
                        AssetBalanceTransferMetadataDto {
                            outgoing_change: t.outgoing_change.into(),
                            incoming_change: t.incoming_change.into(),
                        },
                    ),
                }
            }
            IdentifiableTransactionWithIdentifiableEntries::AccountFees(t) => {
                let (transaction_id, date, fee_entries) = extract_identifiable_base(t.base);
                TransactionDto {
                    transaction_id,
                    date,
                    fee_entries,
                    transaction_type: TransactionTypeDto::AccountFees(AccountFeesMetadataDto {
                        entry: t.entry.into(),
                    }),
                }
            }
        }
    }
}

#[cfg(feature = "backend")]
impl From<TransactionWithIdentifiableEntries> for TransactionDto {
    fn from(value: TransactionWithIdentifiableEntries) -> Self {
        match value {
            TransactionWithIdentifiableEntries::RegularTransaction(t) => {
                let (date, fee_entries) = extract_base_no_id(t.base);
                TransactionDto {
                    transaction_id: None,
                    date,
                    fee_entries,
                    transaction_type: TransactionTypeDto::Regular(RegularTransactionMetadataDto {
                        description: t.description.map(|d| d.into_inner()),
                        entry: t.entry.into(),
                        category_id: t.category_id.0,
                    }),
                }
            }
            TransactionWithIdentifiableEntries::CashTransferOut(t) => {
                let (date, fee_entries) = extract_base_no_id(t.base);
                TransactionDto {
                    transaction_id: None,
                    date,
                    fee_entries,
                    transaction_type: TransactionTypeDto::CashTransferOut(
                        CashTransferOutMetadataDto {
                            entry: t.entry.into(),
                        },
                    ),
                }
            }
            TransactionWithIdentifiableEntries::CashTransferIn(t) => {
                let (date, fee_entries) = extract_base_no_id(t.base);
                TransactionDto {
                    transaction_id: None,
                    date,
                    fee_entries,
                    transaction_type: TransactionTypeDto::CashTransferIn(
                        CashTransferInMetadataDto {
                            entry: t.entry.into(),
                        },
                    ),
                }
            }
            TransactionWithIdentifiableEntries::CashDividend(t) => {
                let (date, fee_entries) = extract_base_no_id(t.base);
                TransactionDto {
                    transaction_id: None,
                    date,
                    fee_entries,
                    transaction_type: TransactionTypeDto::CashDividend(CashDividendMetadataDto {
                        entry: t.entry.into(),
                        origin_asset_id: t.origin_asset_id.0,
                    }),
                }
            }
            TransactionWithIdentifiableEntries::AssetPurchase(t) => {
                let (date, fee_entries) = extract_base_no_id(t.base);
                TransactionDto {
                    transaction_id: None,
                    date,
                    fee_entries,
                    transaction_type: TransactionTypeDto::AssetPurchase(AssetPurchaseMetadataDto {
                        purchase: t.purchase_change.into(),
                        sale: t.cash_outgoings_change.into(),
                    }),
                }
            }
            TransactionWithIdentifiableEntries::AssetSale(t) => {
                let (date, fee_entries) = extract_base_no_id(t.base);
                TransactionDto {
                    transaction_id: None,
                    date,
                    fee_entries,
                    transaction_type: TransactionTypeDto::AssetSale(AssetSaleMetadataDto {
                        sale: t.sale_entry.into(),
                        proceeds: t.proceeds_entry.into(),
                    }),
                }
            }
            TransactionWithIdentifiableEntries::AssetTrade(t) => {
                let (date, fee_entries) = extract_base_no_id(t.base);
                TransactionDto {
                    transaction_id: None,
                    date,
                    fee_entries,
                    transaction_type: TransactionTypeDto::AssetTrade(AssetTradeMetadataDto {
                        outgoing_entry: t.outgoing_entry.into(),
                        incoming_entry: t.incoming_entry.into(),
                    }),
                }
            }
            TransactionWithIdentifiableEntries::AssetTransferIn(t) => {
                let (date, fee_entries) = extract_base_no_id(t.base);
                TransactionDto {
                    transaction_id: None,
                    date,
                    fee_entries,
                    transaction_type: TransactionTypeDto::AssetTransferIn(
                        AssetTransferInMetadataDto {
                            entry: t.entry.into(),
                        },
                    ),
                }
            }
            TransactionWithIdentifiableEntries::AssetTransferOut(t) => {
                let (date, fee_entries) = extract_base_no_id(t.base);
                TransactionDto {
                    transaction_id: None,
                    date,
                    fee_entries,
                    transaction_type: TransactionTypeDto::AssetTransferOut(
                        AssetTransferOutMetadataDto {
                            entry: t.entry.into(),
                        },
                    ),
                }
            }
            TransactionWithIdentifiableEntries::AssetDividend(t) => {
                let (date, fee_entries) = extract_base_no_id(t.base);
                TransactionDto {
                    transaction_id: None,
                    date,
                    fee_entries,
                    transaction_type: TransactionTypeDto::AssetDividend(AssetDividendMetadataDto {
                        entry: t.entry.into(),
                    }),
                }
            }
            TransactionWithIdentifiableEntries::AssetBalanceTransfer(t) => {
                let (date, fee_entries) = extract_base_no_id(t.base);
                TransactionDto {
                    transaction_id: None,
                    date,
                    fee_entries,
                    transaction_type: TransactionTypeDto::AssetBalanceTransfer(
                        AssetBalanceTransferMetadataDto {
                            outgoing_change: t.outgoing_change.into(),
                            incoming_change: t.incoming_change.into(),
                        },
                    ),
                }
            }
            TransactionWithIdentifiableEntries::AccountFees(t) => {
                let (date, fee_entries) = extract_base_no_id(t.base);
                TransactionDto {
                    transaction_id: None,
                    date,
                    fee_entries,
                    transaction_type: TransactionTypeDto::AccountFees(AccountFeesMetadataDto {
                        entry: t.entry.into(),
                    }),
                }
            }
        }
    }
}
