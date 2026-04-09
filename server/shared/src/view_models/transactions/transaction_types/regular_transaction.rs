#[cfg(feature = "backend")]
use business::dtos::{
    entry_dto::EntryDto,
    transaction_dto::{RegularTransactionMetadataDto, TransactionDto, TransactionTypeDto},
};
use macros::type_tag;
use serde::{Deserialize, Serialize};

use crate::view_models::transactions::base_models::category_id::RequiredCategoryId;
use crate::view_models::transactions::base_models::description::Description;
use crate::view_models::transactions::base_models::{
    account_asset_entry::{
        AccountAssetEntryViewModel, IdentifiableAccountAssetEntryViewModel,
        NonZeroAccountAssetEntry, RequiredIdentifiableAccountAssetEntryViewModel,
    },
    transaction_base::{
        IdentifiableTransactionBaseWithIdentifiableEntries,
        RequiredIdentifiableTransactionBaseWithIdentifiableEntries, TransactionBaseWithEntries,
        TransactionBaseWithIdentifiableEntries,
    },
};

pub type RegularTransactionInputViewModel =
    RegularTransaction<TransactionBaseWithEntries, AccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type RegularTransactionViewModel =
    RegularTransaction<TransactionBaseWithEntries, NonZeroAccountAssetEntry>;
#[allow(dead_code)]
pub type RegularTransactionWithIdentifiableEntriesViewModel = RegularTransaction<
    TransactionBaseWithIdentifiableEntries,
    IdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type RequiredRegularTransactionWithIdentifiableEntriesViewModel = RegularTransaction<
    TransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type IdentifiableRegularTransactionWithIdentifiableEntriesViewModel = RegularTransaction<
    IdentifiableTransactionBaseWithIdentifiableEntries,
    IdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type RequiredIdentifiableRegularTransactionWithIdentifiableEntriesViewModel =
    RegularTransaction<
        RequiredIdentifiableTransactionBaseWithIdentifiableEntries,
        RequiredIdentifiableAccountAssetEntryViewModel,
    >;

#[type_tag(value = "regular")]
#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct RegularTransaction<B, E> {
    #[serde(flatten)]
    pub base: B,

    /// Entry related to a transaction.
    pub entry: E,

    /// Specific bespoke category id.
    pub category_id: RequiredCategoryId,

    /// Description of the transaction.
    pub description: Option<Description>,
}

#[cfg(feature = "backend")]
impl<E: Into<EntryDto>> From<RegularTransaction<TransactionBaseWithEntries, E>> for TransactionDto {
    fn from(trans: RegularTransaction<TransactionBaseWithEntries, E>) -> Self {
        TransactionDto {
            transaction_id: None,
            date: trans.base.date,
            fee_entries: match trans.base.fees {
                Some(f) => f.into_iter().map(|x| x.into()).collect(),
                None => [].into(),
            },
            transaction_type: TransactionTypeDto::Regular(RegularTransactionMetadataDto {
                description: trans.description.map(|d| d.into_inner()),
                entry: trans.entry.into(),
                category_id: trans.category_id.0,
            }),
        }
    }
}

#[cfg(feature = "backend")]
impl<B, E> From<TransactionDto> for RegularTransaction<B, E>
where
    E: From<EntryDto>,
    B: From<TransactionDto>,
{
    fn from(value: TransactionDto) -> Self {
        if let TransactionTypeDto::Regular(r) = value.clone().transaction_type {
            Self {
                r#type: Default::default(),
                base: value.into(),
                entry: r.entry.into(),
                category_id: RequiredCategoryId(r.category_id),
                description: r.description.map(Description::from_trusted),
            }
        } else {
            panic!("Can not convert TransactionDto into RequiredIdentifiableRegularTransactionWithIdentifiableEntriesViewModel as the type is not Regular")
        }
    }
}
