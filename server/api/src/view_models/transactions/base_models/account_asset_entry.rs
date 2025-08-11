use business::dtos::entry_dto::EntryDto;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::view_models::accounts::base_models::account_id::RequiredAccountId;
use crate::view_models::assets::base_models::asset_id::RequiredAssetId;
use crate::view_models::transactions::base_models::entry_id::{EntryId, RequiredEntryId};

pub type IdentifiableAccountAssetEntryViewModel = IdentifiableAccountAssetEntry<EntryId>;
pub type RequiredIdentifiableAccountAssetEntryViewModel =
    IdentifiableAccountAssetEntry<RequiredEntryId>;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct IdentifiableAccountAssetEntry<I> {
    /// Id representing a single entry in a transaction.
    #[schema(inline = false)]
    pub entry_id: I,

    #[serde(flatten)]
    pub entry: AccountAssetEntryViewModel,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AccountAssetEntryViewModel {
    /// The id of an account for which to the entry is related.
    pub account_id: RequiredAccountId,

    /// The id of an asset in the account for which the entry is related.
    pub asset_id: RequiredAssetId,

    /// The number of units of the asset that were added or removed from the account.
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub amount: Decimal,
}

impl From<AccountAssetEntryViewModel> for EntryDto {
    fn from(entry: AccountAssetEntryViewModel) -> Self {
        EntryDto {
            entry_id: None,
            asset_id: entry.asset_id.0,
            quantity: entry.amount,
            account_id: entry.account_id.0,
        }
    }
}

impl From<IdentifiableAccountAssetEntryViewModel> for EntryDto {
    fn from(value: IdentifiableAccountAssetEntryViewModel) -> Self {
        EntryDto {
            entry_id: value.entry_id.0,
            asset_id: value.entry.asset_id.0,
            quantity: value.entry.amount,
            account_id: value.entry.account_id.0,
        }
    }
}

impl From<RequiredIdentifiableAccountAssetEntryViewModel> for EntryDto {
    fn from(value: RequiredIdentifiableAccountAssetEntryViewModel) -> Self {
        EntryDto {
            entry_id: Some(value.entry_id.0),
            asset_id: value.entry.asset_id.0,
            quantity: value.entry.amount,
            account_id: value.entry.account_id.0,
        }
    }
}

impl From<EntryDto> for AccountAssetEntryViewModel {
    fn from(entry: EntryDto) -> Self {
        AccountAssetEntryViewModel {
            account_id: RequiredAccountId(entry.account_id),
            asset_id: RequiredAssetId(entry.asset_id),
            amount: entry.quantity,
        }
    }
}

impl From<EntryDto> for RequiredIdentifiableAccountAssetEntryViewModel {
    fn from(entry: EntryDto) -> Self {
        RequiredIdentifiableAccountAssetEntryViewModel {
            entry_id: RequiredEntryId(entry.entry_id.unwrap()),
            entry: entry.into(),
        }
    }
}

impl From<EntryDto> for IdentifiableAccountAssetEntryViewModel {
    fn from(entry: EntryDto) -> Self {
        IdentifiableAccountAssetEntryViewModel {
            entry_id: EntryId(entry.entry_id),
            entry: entry.into(),
        }
    }
}
