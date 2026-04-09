#[cfg(feature = "backend")]
use business::dtos::{
    entry_dto::EntryDto,
    transaction_dto::{AccountFeesMetadataDto, TransactionDto, TransactionTypeDto},
};
use macros::type_tag;
use serde::{Deserialize, Serialize};

use crate::view_models::transactions::base_models::{
    account_asset_entry::{
        AccountAssetEntryViewModel, IdentifiableAccountAssetEntryViewModel,
        NegativeAccountAssetEntry, RequiredIdentifiableAccountAssetEntryViewModel,
    },
    transaction_base::{
        IdentifiableTransactionBaseWithIdentifiableEntries,
        RequiredIdentifiableTransactionBaseWithIdentifiableEntries, TransactionBaseWithEntries,
        TransactionBaseWithIdentifiableEntries,
    },
};

pub type AccountFeesInputViewModel =
    AccountFees<TransactionBaseWithEntries, AccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type AccountFeesViewModel = AccountFees<TransactionBaseWithEntries, NegativeAccountAssetEntry>;
#[allow(dead_code)]
pub type AccountFeesWithIdentifiableEntriesViewModel =
    AccountFees<TransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type RequiredAccountFeesWithIdentifiableEntriesViewModel = AccountFees<
    TransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type IdentifiableAccountFeesWithIdentifiableEntriesViewModel = AccountFees<
    IdentifiableTransactionBaseWithIdentifiableEntries,
    IdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type RequiredIdentifiableAccountFeesWithIdentifiableEntriesViewModel = AccountFees<
    RequiredIdentifiableTransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;

#[type_tag(value = "account_fees")]
#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AccountFees<B, E> {
    #[serde(flatten)]
    pub base: B,

    /// How much cash is being transferred out
    pub entry: E,
}

#[cfg(feature = "backend")]
impl<E: Into<EntryDto>> From<AccountFees<TransactionBaseWithEntries, E>> for TransactionDto {
    fn from(value: AccountFees<TransactionBaseWithEntries, E>) -> Self {
        TransactionDto {
            transaction_id: None,
            date: value.base.date,
            fee_entries: match value.base.fees {
                Some(f) => f.into_iter().map(|x| x.into()).collect(),
                None => [].into(),
            },
            transaction_type: TransactionTypeDto::AccountFees(AccountFeesMetadataDto {
                entry: value.entry.into(),
            }),
        }
    }
}

#[cfg(feature = "backend")]
impl<B, E> From<TransactionDto> for AccountFees<B, E>
where
    E: From<EntryDto>,
    B: From<TransactionDto>,
{
    fn from(value: TransactionDto) -> Self {
        if let TransactionTypeDto::AccountFees(r) = value.clone().transaction_type {
            AccountFees {
                r#type: Default::default(),
                entry: r.entry.into(),
                base: value.into(),
            }
        } else {
            panic!("Can not convert TransactionDto into AccountFees as the type is not AccountFees")
        }
    }
}
