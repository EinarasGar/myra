use business::dtos::{
    entry_dto::EntryDto,
    transaction_dto::{CashTransferInMetadataDto, TransactionDto, TransactionTypeDto},
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

pub type CashTransferInViewModel =
    CashTransferIn<TransactionBaseWithEntries, AccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type CashTransferInWithIdentifiableEntriesViewModel =
    CashTransferIn<TransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type RequiredCashTransferInWithIdentifiableEntriesViewModel = CashTransferIn<
    TransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type IdentifiableCashTransferInWithIdentifiableEntriesViewModel = CashTransferIn<
    IdentifiableTransactionBaseWithIdentifiableEntries,
    IdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type RequiredIdentifiableCashTransferInWithIdentifiableEntriesViewModel = CashTransferIn<
    RequiredIdentifiableTransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;

#[type_tag(value = "cash_transfer_in")]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CashTransferIn<B, E> {
    #[serde(flatten)]
    pub base: B,

    /// How much cash is being transferred in
    pub entry: E,
}

impl From<CashTransferInViewModel> for TransactionDto {
    fn from(value: CashTransferInViewModel) -> Self {
        TransactionDto {
            transaction_id: None,
            date: value.base.date,
            fee_entries: match value.base.fees {
                Some(f) => f.into_iter().map(|x| x.into()).collect(),
                None => [].into(),
            },
            transaction_type: TransactionTypeDto::CashTransferIn(CashTransferInMetadataDto {
                entry: value.entry.into(),
            }),
        }
    }
}

impl<B, E> From<TransactionDto> for CashTransferIn<B, E>
where
    E: From<EntryDto>,
    B: From<TransactionDto>,
{
    fn from(value: TransactionDto) -> Self {
        if let TransactionTypeDto::CashTransferIn(r) = value.clone().transaction_type {
            CashTransferIn {
                r#type: Default::default(),
                entry: r.entry.into(),
                base: value.into(),
            }
        } else {
            panic!("Can not convert TransactionDto into CashTransferIn as the type is not CashTransferIn")
        }
    }
}
