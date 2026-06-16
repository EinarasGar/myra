#[cfg(feature = "backend")]
use business::dtos::{
    entry_dto::EntryDto,
    transaction_dto::{CashBalanceTransferMetadataDto, TransactionDto, TransactionTypeDto},
};
use macros::type_tag;
use serde::{Deserialize, Serialize};

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

pub type CashBalanceTransferInputViewModel = CashBalanceTransferViewModel;
#[allow(dead_code)]
pub type CashBalanceTransferViewModel =
    CashBalanceTransfer<TransactionBaseWithEntries, AccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type CashBalanceTransferWithIdentifiableEntriesViewModel = CashBalanceTransfer<
    TransactionBaseWithIdentifiableEntries,
    IdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type RequiredCashBalanceTransferWithIdentifiableEntriesViewModel = CashBalanceTransfer<
    TransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type IdentifiableCashBalanceTransferWithIdentifiableEntriesViewModel = CashBalanceTransfer<
    IdentifiableTransactionBaseWithIdentifiableEntries,
    IdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type RequiredIdentifiableCashBalanceTransferWithIdentifiableEntriesViewModel =
    CashBalanceTransfer<
        RequiredIdentifiableTransactionBaseWithIdentifiableEntries,
        RequiredIdentifiableAccountAssetEntryViewModel,
    >;

#[type_tag(value = "cash_balance_transfer")]
#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct CashBalanceTransfer<B, E> {
    #[serde(flatten)]
    pub base: B,

    pub outgoing_change: E,

    pub incoming_change: E,
}

#[cfg(feature = "backend")]
impl<E: Into<EntryDto>> From<CashBalanceTransfer<TransactionBaseWithEntries, E>>
    for TransactionDto
{
    fn from(value: CashBalanceTransfer<TransactionBaseWithEntries, E>) -> Self {
        TransactionDto {
            transaction_id: None,
            date: value.base.date,
            fee_entries: match value.base.fees {
                Some(f) => f.into_iter().map(|x| x.into()).collect(),
                None => [].into(),
            },
            transaction_type: TransactionTypeDto::CashBalanceTransfer(
                CashBalanceTransferMetadataDto {
                    outgoing_change: value.outgoing_change.into(),
                    incoming_change: value.incoming_change.into(),
                },
            ),
        }
    }
}

#[cfg(feature = "backend")]
impl<B, E> From<TransactionDto> for CashBalanceTransfer<B, E>
where
    E: From<EntryDto>,
    B: From<TransactionDto>,
{
    fn from(value: TransactionDto) -> Self {
        if let TransactionTypeDto::CashBalanceTransfer(r) = value.clone().transaction_type {
            CashBalanceTransfer {
                r#type: Default::default(),
                outgoing_change: r.outgoing_change.into(),
                incoming_change: r.incoming_change.into(),
                base: value.into(),
            }
        } else {
            panic!("Can not convert TransactionDto into CashBalanceTransfer as the type is not CashBalanceTransfer")
        }
    }
}
