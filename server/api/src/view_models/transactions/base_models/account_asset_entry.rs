use business::dtos::entry_dto::EntryDto;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[aliases(
    IdentifiableAccountAssetEntryViewModel = IdentifiableAccountAssetEntry<Option<i32>>,
    MandatoryIdentifiableAccountAssetEntryViewModel = IdentifiableAccountAssetEntry<i32>
)]
pub struct IdentifiableAccountAssetEntry<I> {
    /// Id representing a single entry in a transaction.
    pub entry_id: I,

    #[serde(flatten)]
    pub entry: AccountAssetEntryViewModel,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AccountAssetEntryViewModel {
    /// The id of an account for which to the entry is related.
    pub account_id: Uuid,

    /// The id of an asset in the account for which the entry is related.
    pub asset_id: i32,

    /// The number of units of the asset that were added or removed from the account.
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    pub amount: Decimal,
}

impl From<AccountAssetEntryViewModel> for EntryDto {
    fn from(entry: AccountAssetEntryViewModel) -> Self {
        EntryDto {
            entry_id: None,
            asset_id: entry.asset_id,
            quantity: entry.amount,
            account_id: entry.account_id,
        }
    }
}

impl From<IdentifiableAccountAssetEntryViewModel> for EntryDto {
    fn from(value: IdentifiableAccountAssetEntryViewModel) -> Self {
        EntryDto {
            entry_id: value.entry_id,
            asset_id: value.entry.asset_id,
            quantity: value.entry.amount,
            account_id: value.entry.account_id,
        }
    }
}

impl From<MandatoryIdentifiableAccountAssetEntryViewModel> for EntryDto {
    fn from(value: MandatoryIdentifiableAccountAssetEntryViewModel) -> Self {
        EntryDto {
            entry_id: Some(value.entry_id),
            asset_id: value.entry.asset_id,
            quantity: value.entry.amount,
            account_id: value.entry.account_id,
        }
    }
}

impl From<EntryDto> for AccountAssetEntryViewModel {
    fn from(entry: EntryDto) -> Self {
        AccountAssetEntryViewModel {
            account_id: entry.account_id,
            asset_id: entry.asset_id,
            amount: entry.quantity,
        }
    }
}

impl From<EntryDto> for MandatoryIdentifiableAccountAssetEntryViewModel {
    fn from(entry: EntryDto) -> Self {
        MandatoryIdentifiableAccountAssetEntryViewModel {
            entry_id: entry.entry_id.unwrap(),
            entry: entry.into(),
        }
    }
}

impl From<EntryDto> for IdentifiableAccountAssetEntryViewModel {
    fn from(entry: EntryDto) -> Self {
        IdentifiableAccountAssetEntryViewModel {
            entry_id: entry.entry_id,
            entry: entry.into(),
        }
    }
}
