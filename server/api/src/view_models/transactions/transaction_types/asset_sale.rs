use business::dtos::{
    entry_dto::EntryDto,
    transaction_dto::{AssetSaleMetadataDto, TransactionDto, TransactionTypeDto},
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

pub type AssetSaleViewModel = AssetSale<TransactionBaseWithEntries, AccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type AssetSaleWithIdentifiableEntriesViewModel =
    AssetSale<TransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type RequiredAssetSaleWithIdentifiableEntriesViewModel = AssetSale<
    TransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type IdentifiableAssetSaleWithIdentifiableEntriesViewModel = AssetSale<
    IdentifiableTransactionBaseWithIdentifiableEntries,
    IdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type RequiredIdentifiableAssetSaleWithIdentifiableEntriesViewModel = AssetSale<
    RequiredIdentifiableTransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;

#[type_tag(value = "asset_sale")]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AssetSale<B, E> {
    #[serde(flatten)]
    pub base: B,

    pub sale_entry: E,

    pub proceeds_entry: E,
}

impl From<AssetSaleViewModel> for TransactionDto {
    fn from(value: AssetSaleViewModel) -> Self {
        TransactionDto {
            transaction_id: None,
            date: value.base.date,
            fee_entries: match value.base.fees {
                Some(f) => f.into_iter().map(|x| x.into()).collect(),
                None => [].into(),
            },
            transaction_type: TransactionTypeDto::AssetSale(AssetSaleMetadataDto {
                sale: value.sale_entry.into(),
                proceeds: value.proceeds_entry.into(),
            }),
        }
    }
}

impl<B, E> From<TransactionDto> for AssetSale<B, E>
where
    E: From<EntryDto>,
    B: From<TransactionDto>,
{
    fn from(value: TransactionDto) -> Self {
        if let TransactionTypeDto::AssetSale(r) = value.clone().transaction_type {
            AssetSale {
                r#type: Default::default(),
                sale_entry: r.sale.into(),
                proceeds_entry: r.proceeds.into(),
                base: value.into(),
            }
        } else {
            panic!("Can not convert TransactionDto into AssetSale as the type is not AssetSale")
        }
    }
}
