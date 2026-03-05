use business::dtos::{
    entry_dto::EntryDto,
    transaction_dto::{AssetBalanceTransferMetadataDto, TransactionDto, TransactionTypeDto},
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

#[allow(dead_code)]
pub type AssetBalanceTransferViewModel =
    AssetBalanceTransfer<TransactionBaseWithEntries, AccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type AssetBalanceTransferWithIdentifiableEntriesViewModel = AssetBalanceTransfer<
    TransactionBaseWithIdentifiableEntries,
    IdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type RequiredAssetBalanceTransferWithIdentifiableEntriesViewModel = AssetBalanceTransfer<
    TransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type IdentifiableAssetBalanceTransferWithIdentifiableEntriesViewModel = AssetBalanceTransfer<
    IdentifiableTransactionBaseWithIdentifiableEntries,
    IdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type RequiredIdentifiableAssetBalanceTransferWithIdentifiableEntriesViewModel =
    AssetBalanceTransfer<
        RequiredIdentifiableTransactionBaseWithIdentifiableEntries,
        RequiredIdentifiableAccountAssetEntryViewModel,
    >;

#[type_tag(value = "asset_balance_transfer")]
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AssetBalanceTransfer<B, E> {
    #[serde(flatten)]
    pub base: B,

    pub outgoing_change: E,

    pub incoming_change: E,
}

impl<E: Into<EntryDto>> From<AssetBalanceTransfer<TransactionBaseWithEntries, E>> for TransactionDto {
    fn from(value: AssetBalanceTransfer<TransactionBaseWithEntries, E>) -> Self {
        TransactionDto {
            transaction_id: None,
            date: value.base.date,
            fee_entries: match value.base.fees {
                Some(f) => f.into_iter().map(|x| x.into()).collect(),
                None => [].into(),
            },
            transaction_type: TransactionTypeDto::AssetBalanceTransfer(AssetBalanceTransferMetadataDto {
                outgoing_change: value.outgoing_change.into(),
                incoming_change: value.incoming_change.into(),
            }),
        }
    }
}

impl<B, E> From<TransactionDto> for AssetBalanceTransfer<B, E>
where
    E: From<EntryDto>,
    B: From<TransactionDto>,
{
    fn from(value: TransactionDto) -> Self {
        if let TransactionTypeDto::AssetBalanceTransfer(r) = value.clone().transaction_type {
            AssetBalanceTransfer {
                r#type: Default::default(),
                outgoing_change: r.outgoing_change.into(),
                incoming_change: r.incoming_change.into(),
                base: value.into(),
            }
        } else {
            panic!("Can not convert TransactionDto into AssetBalanceTransfer as the type is not AssetBalanceTransfer")
        }
    }
}
