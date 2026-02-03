use business::dtos::{
    entry_dto::EntryDto,
    transaction_dto::{AssetDividendMetadataDto, TransactionDto, TransactionTypeDto},
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

pub type AssetDividendViewModel =
    AssetDividend<TransactionBaseWithEntries, AccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type AssetDividendWithIdentifiableEntriesViewModel =
    AssetDividend<TransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type RequiredAssetDividendWithIdentifiableEntriesViewModel = AssetDividend<
    TransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type IdentifiableAssetDividendWithIdentifiableEntriesViewModel = AssetDividend<
    IdentifiableTransactionBaseWithIdentifiableEntries,
    IdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type RequiredIdentifiableAssetDividendWithIdentifiableEntriesViewModel = AssetDividend<
    RequiredIdentifiableTransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;

#[type_tag(value = "asset_dividend")]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AssetDividend<B, E> {
    #[serde(flatten)]
    pub base: B,

    /// How much cash is being transferred out
    pub entry: E,
}

impl From<AssetDividendViewModel> for TransactionDto {
    fn from(value: AssetDividendViewModel) -> Self {
        TransactionDto {
            transaction_id: None,
            date: value.base.date,
            fee_entries: match value.base.fees {
                Some(f) => f.into_iter().map(|x| x.into()).collect(),
                None => [].into(),
            },
            transaction_type: TransactionTypeDto::AssetDividend(AssetDividendMetadataDto {
                entry: value.entry.into(),
            }),
        }
    }
}

impl<B, E> From<TransactionDto> for AssetDividend<B, E>
where
    E: From<EntryDto>,
    B: From<TransactionDto>,
{
    fn from(value: TransactionDto) -> Self {
        if let TransactionTypeDto::AssetDividend(r) = value.clone().transaction_type {
            AssetDividend {
                r#type: Default::default(),
                entry: r.entry.into(),
                base: value.into(),
            }
        } else {
            panic!("Can not convert TransactionDto into AssetDividend as the type is not AssetDividend")
        }
    }
}
