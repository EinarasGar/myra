use business::dtos::{
    entry_dto::EntryDto,
    transaction_dto::{CashTransferOutMetadataDto, TransactionDto, TransactionTypeDto},
};
use macros::type_tag;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::view_models::transactions::base_models::{
    account_asset_entry::{
        AccountAssetEntryViewModel, IdentifiableAccountAssetEntryViewModel,
        RequiredIdentifiableAccountAssetEntryViewModel,
    },
    transaction_base::{
        IdentifiableTransactionBaseWithIdentifiableEntries,
        RequiredIdentifiableTransactionBaseWithIdentifiableEntries, TransactionBaseWithEntries,
        TransactionBaseWithIdentifiableEntries,
    },
};

pub type CashTransferOutViewModel =
    CashTransferOut<TransactionBaseWithEntries, AccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type CashTransferOutWithIdentifiableEntriesViewModel =
    CashTransferOut<TransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type RequiredCashTransferOutWithIdentifiableEntriesViewModel = CashTransferOut<
    TransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type IdentifiableCashTransferOutWithIdentifiableEntriesViewModel = CashTransferOut<
    IdentifiableTransactionBaseWithIdentifiableEntries,
    IdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type RequiredIdentifiableCashTransferOutWithIdentifiableEntriesViewModel = CashTransferOut<
    RequiredIdentifiableTransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;

#[type_tag(value = "cash_transfer_out")]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CashTransferOut<B, E> {
    #[serde(flatten)]
    pub base: B,

    /// How much cash is being transferred out
    pub entry: E,
}

impl From<CashTransferOutViewModel> for TransactionDto {
    fn from(value: CashTransferOutViewModel) -> Self {
        TransactionDto {
            transaction_id: None,
            date: value.base.date,
            fee_entries: match value.base.fees {
                Some(f) => f.into_iter().map(|x| x.into()).collect(),
                None => [].into(),
            },
            transaction_type: TransactionTypeDto::CashTransferOut(CashTransferOutMetadataDto {
                entry: value.entry.into(),
            }),
        }
    }
}

impl<B, E> From<TransactionDto> for CashTransferOut<B, E>
where
    E: From<EntryDto>,
    B: From<TransactionDto>,
{
    fn from(value: TransactionDto) -> Self {
        if let TransactionTypeDto::CashTransferOut(r) = value.clone().transaction_type {
            CashTransferOut {
                r#type: Default::default(),
                entry: r.entry.into(),
                base: value.into(),
            }
        } else {
            panic!("Can not convert TransactionDto into CashTransferOut as the type is not CashTransferOut")
        }
    }
}
