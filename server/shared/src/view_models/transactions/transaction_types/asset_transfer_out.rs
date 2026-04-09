#[cfg(feature = "backend")]
use business::dtos::{
    entry_dto::EntryDto,
    transaction_dto::{AssetTransferOutMetadataDto, TransactionDto, TransactionTypeDto},
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

pub type AssetTransferOutInputViewModel =
    AssetTransferOut<TransactionBaseWithEntries, AccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type AssetTransferOutViewModel =
    AssetTransferOut<TransactionBaseWithEntries, NegativeAccountAssetEntry>;
#[allow(dead_code)]
pub type AssetTransferOutWithIdentifiableEntriesViewModel = AssetTransferOut<
    TransactionBaseWithIdentifiableEntries,
    IdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type RequiredAssetTransferOutWithIdentifiableEntriesViewModel = AssetTransferOut<
    TransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type IdentifiableAssetTransferOutWithIdentifiableEntriesViewModel = AssetTransferOut<
    IdentifiableTransactionBaseWithIdentifiableEntries,
    IdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type RequiredIdentifiableAssetTransferOutWithIdentifiableEntriesViewModel = AssetTransferOut<
    RequiredIdentifiableTransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;

#[type_tag(value = "asset_transfer_out")]
#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AssetTransferOut<B, E> {
    #[serde(flatten)]
    pub base: B,

    /// How much cash is being transferred out
    pub entry: E,
}

#[cfg(feature = "backend")]
impl<E: Into<EntryDto>> From<AssetTransferOut<TransactionBaseWithEntries, E>> for TransactionDto {
    fn from(value: AssetTransferOut<TransactionBaseWithEntries, E>) -> Self {
        TransactionDto {
            transaction_id: None,
            date: value.base.date,
            fee_entries: match value.base.fees {
                Some(f) => f.into_iter().map(|x| x.into()).collect(),
                None => [].into(),
            },
            transaction_type: TransactionTypeDto::AssetTransferOut(AssetTransferOutMetadataDto {
                entry: value.entry.into(),
            }),
        }
    }
}

#[cfg(feature = "backend")]
impl<B, E> From<TransactionDto> for AssetTransferOut<B, E>
where
    E: From<EntryDto>,
    B: From<TransactionDto>,
{
    fn from(value: TransactionDto) -> Self {
        if let TransactionTypeDto::AssetTransferOut(r) = value.clone().transaction_type {
            AssetTransferOut {
                r#type: Default::default(),
                entry: r.entry.into(),
                base: value.into(),
            }
        } else {
            panic!("Can not convert TransactionDto into AssetTransferOut as the type is not AssetTransferOut")
        }
    }
}
