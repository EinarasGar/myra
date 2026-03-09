use business::dtos::{
    entry_dto::EntryDto,
    transaction_dto::{AssetTransferInMetadataDto, TransactionDto, TransactionTypeDto},
};
use macros::type_tag;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::view_models::transactions::base_models::{
    account_asset_entry::{
        AccountAssetEntryViewModel, IdentifiableAccountAssetEntryViewModel,
        PositiveAccountAssetEntry, RequiredIdentifiableAccountAssetEntryViewModel,
    },
    transaction_base::{
        IdentifiableTransactionBaseWithIdentifiableEntries,
        RequiredIdentifiableTransactionBaseWithIdentifiableEntries, TransactionBaseWithEntries,
        TransactionBaseWithIdentifiableEntries,
    },
};

pub type AssetTransferInInputViewModel =
    AssetTransferIn<TransactionBaseWithEntries, AccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type AssetTransferInViewModel =
    AssetTransferIn<TransactionBaseWithEntries, PositiveAccountAssetEntry>;
#[allow(dead_code)]
pub type AssetTransferInWithIdentifiableEntriesViewModel =
    AssetTransferIn<TransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type RequiredAssetTransferInWithIdentifiableEntriesViewModel = AssetTransferIn<
    TransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type IdentifiableAssetTransferInWithIdentifiableEntriesViewModel = AssetTransferIn<
    IdentifiableTransactionBaseWithIdentifiableEntries,
    IdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type RequiredIdentifiableAssetTransferInWithIdentifiableEntriesViewModel = AssetTransferIn<
    RequiredIdentifiableTransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;

#[type_tag(value = "asset_transfer_in")]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AssetTransferIn<B, E> {
    #[serde(flatten)]
    pub base: B,

    /// How much cash is being transferred out
    pub entry: E,
}

impl<E: Into<EntryDto>> From<AssetTransferIn<TransactionBaseWithEntries, E>> for TransactionDto {
    fn from(value: AssetTransferIn<TransactionBaseWithEntries, E>) -> Self {
        TransactionDto {
            transaction_id: None,
            date: value.base.date,
            fee_entries: match value.base.fees {
                Some(f) => f.into_iter().map(|x| x.into()).collect(),
                None => [].into(),
            },
            transaction_type: TransactionTypeDto::AssetTransferIn(AssetTransferInMetadataDto {
                entry: value.entry.into(),
            }),
        }
    }
}

impl<B, E> From<TransactionDto> for AssetTransferIn<B, E>
where
    E: From<EntryDto>,
    B: From<TransactionDto>,
{
    fn from(value: TransactionDto) -> Self {
        if let TransactionTypeDto::AssetTransferIn(r) = value.clone().transaction_type {
            AssetTransferIn {
                r#type: Default::default(),
                entry: r.entry.into(),
                base: value.into(),
            }
        } else {
            panic!("Can not convert TransactionDto into AssetTransferIn as the type is not AssetTransferIn")
        }
    }
}
