#[cfg(feature = "backend")]
use business::dtos::{
    entry_dto::EntryDto,
    transaction_dto::{AssetTradeMetadataDto, TransactionDto, TransactionTypeDto},
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

pub type AssetTradeInputViewModel = AssetTradeViewModel;
#[allow(dead_code)]
pub type AssetTradeViewModel = AssetTrade<TransactionBaseWithEntries, AccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type AssetTradeWithIdentifiableEntriesViewModel =
    AssetTrade<TransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>;
#[allow(dead_code)]
pub type RequiredAssetTradeWithIdentifiableEntriesViewModel = AssetTrade<
    TransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type IdentifiableAssetTradeWithIdentifiableEntriesViewModel = AssetTrade<
    IdentifiableTransactionBaseWithIdentifiableEntries,
    IdentifiableAccountAssetEntryViewModel,
>;
#[allow(dead_code)]
pub type RequiredIdentifiableAssetTradeWithIdentifiableEntriesViewModel = AssetTrade<
    RequiredIdentifiableTransactionBaseWithIdentifiableEntries,
    RequiredIdentifiableAccountAssetEntryViewModel,
>;

#[type_tag(value = "asset_trade")]
#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AssetTrade<B, E> {
    #[serde(flatten)]
    pub base: B,

    /// How many units of asset are removed as part of the trade.
    pub outgoing_entry: E,

    /// How many units of asset are added as part of the trade.
    pub incoming_entry: E,
}

#[cfg(feature = "backend")]
impl<E: Into<EntryDto>> From<AssetTrade<TransactionBaseWithEntries, E>> for TransactionDto {
    fn from(value: AssetTrade<TransactionBaseWithEntries, E>) -> Self {
        TransactionDto {
            transaction_id: None,
            date: value.base.date,
            fee_entries: match value.base.fees {
                Some(f) => f.into_iter().map(|x| x.into()).collect(),
                None => [].into(),
            },
            transaction_type: TransactionTypeDto::AssetTrade(AssetTradeMetadataDto {
                outgoing_entry: value.outgoing_entry.into(),
                incoming_entry: value.incoming_entry.into(),
            }),
        }
    }
}

#[cfg(feature = "backend")]
impl<B, E> From<TransactionDto> for AssetTrade<B, E>
where
    E: From<EntryDto>,
    B: From<TransactionDto>,
{
    fn from(value: TransactionDto) -> Self {
        if let TransactionTypeDto::AssetTrade(r) = value.clone().transaction_type {
            AssetTrade {
                r#type: Default::default(),
                outgoing_entry: r.outgoing_entry.into(),
                incoming_entry: r.incoming_entry.into(),
                base: value.into(),
            }
        } else {
            panic!("Can not convert TransactionDto into AssetTrade as the type is not AssetTrade")
        }
    }
}
