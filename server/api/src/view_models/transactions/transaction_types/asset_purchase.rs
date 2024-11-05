use business::dtos::{
    entry_dto::EntryDto,
    transaction_dto::{AssetPurchaseMetadataDto, TransactionDto, TransactionTypeDto},
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::view_models::transactions::base_models::{
    account_asset_entry::{
        AccountAssetEntryViewModel, IdentifiableAccountAssetEntryViewModel,
        MandatoryIdentifiableAccountAssetEntryViewModel,
    },
    transaction_base::{
        IdentifiableTransactionBase, IdentifiableTransactionBaseWithIdentifiableEntries,
        MandatoryIdentifiableTransactionBaseWithIdentifiableEntries,
        MandatoryTransactionBaseWithIdentifiableEntries, TransactionBaseWithEntries,
        TransactionBaseWithIdentifiableEntries,
    },
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[aliases(
    AssetPurchaseViewModel = AssetPurchase<TransactionBaseWithEntries, AccountAssetEntryViewModel>,
    AssetPurchaseWithIdentifiableEntriesViewModel = AssetPurchase<TransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>,
    MandatoryAssetPurchaseWithIdentifiableEntriesViewModel = AssetPurchase<TransactionBaseWithIdentifiableEntries, MandatoryIdentifiableAccountAssetEntryViewModel>,
    IdentifiableAssetPurchaseWithIdentifiableEntriesViewModel = AssetPurchase<IdentifiableTransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>,
    MandatoryIdentifiableAssetPurchaseWithIdentifiableEntriesViewModel = AssetPurchase<MandatoryIdentifiableTransactionBaseWithIdentifiableEntries, MandatoryIdentifiableAccountAssetEntryViewModel>,
)]
pub struct AssetPurchase<B, E> {
    #[serde(flatten)]
    pub base: B,

    pub purchase_change: E,

    pub cash_outgoings_change: E,
}

impl From<AssetPurchaseViewModel> for TransactionDto {
    fn from(value: AssetPurchaseViewModel) -> Self {
        TransactionDto {
            transaction_id: None,
            date: value.base.date,
            fee_entries: match value.base.fees {
                Some(f) => f.into_iter().map(|x| x.into()).collect(),
                None => todo!(),
            },
            transaction_type: TransactionTypeDto::AssetPurchase(AssetPurchaseMetadataDto {
                purchase: value.purchase_change.into(),
                sale: value.cash_outgoings_change.into(),
            }),
        }
    }
}

impl<B, E> From<TransactionDto> for AssetPurchase<B, E>
where
    E: From<EntryDto>,
    B: From<TransactionDto>,
{
    fn from(value: TransactionDto) -> Self {
        if let TransactionTypeDto::AssetPurchase(r) = value.clone().transaction_type {
            AssetPurchase {
                purchase_change: r.purchase.into(),
                cash_outgoings_change: r.sale.into(),
                base: value.into(),
            }
        } else {
            panic!("Can not convert TransactionDto into AssetPurchase as the type is not Regular")
        }
    }
}
