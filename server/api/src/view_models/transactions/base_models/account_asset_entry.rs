use business::dtos::entry_dto::EntryDto;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::view_models::accounts::base_models::account_id::RequiredAccountId;
use crate::view_models::assets::base_models::asset_id::RequiredAssetId;
use crate::view_models::transactions::base_models::entry_id::{EntryId, RequiredEntryId};
use crate::view_models::transactions::value_types::{
    Amount, IntoDecimal, NegativeAmount, NonZeroAmount, PositiveAmount,
};

pub type AccountAssetEntryViewModel = AccountAssetEntry<Amount>;

#[allow(dead_code)]
pub type PositiveAccountAssetEntry = AccountAssetEntry<PositiveAmount>;

#[allow(dead_code)]
pub type NegativeAccountAssetEntry = AccountAssetEntry<NegativeAmount>;

#[allow(dead_code)]
pub type NonZeroAccountAssetEntry = AccountAssetEntry<NonZeroAmount>;

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

/// A single account-asset-entry in a transaction.
///
/// The generic parameter `A` determines the amount type:
/// - `Amount` – unvalidated (default, used in response models & macro-generated enums)
/// - `PositiveAmount` – must be > 0, validated at parse time
/// - `NegativeAmount` – must be < 0, validated at parse time
/// - `NonZeroAmount` – must not be 0, validated at parse time
#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AccountAssetEntry<A> {
    /// The id of an account for which the entry is related.
    pub account_id: RequiredAccountId,

    /// The id of an asset in the account for which the entry is related.
    pub asset_id: RequiredAssetId,

    /// The number of units of the asset that were added or removed from the account.
    #[schema(value_type = f64)]
    pub amount: A,
}

impl<A: IntoDecimal> From<AccountAssetEntry<A>> for EntryDto {
    fn from(entry: AccountAssetEntry<A>) -> Self {
        EntryDto {
            entry_id: None,
            asset_id: entry.asset_id.0,
            quantity: entry.amount.into_decimal(),
            account_id: entry.account_id.0,
        }
    }
}

impl From<IdentifiableAccountAssetEntryViewModel> for EntryDto {
    fn from(value: IdentifiableAccountAssetEntryViewModel) -> Self {
        EntryDto {
            entry_id: value.entry_id.0,
            asset_id: value.entry.asset_id.0,
            quantity: value.entry.amount.into_decimal(),
            account_id: value.entry.account_id.0,
        }
    }
}

impl From<RequiredIdentifiableAccountAssetEntryViewModel> for EntryDto {
    fn from(value: RequiredIdentifiableAccountAssetEntryViewModel) -> Self {
        EntryDto {
            entry_id: Some(value.entry_id.0),
            asset_id: value.entry.asset_id.0,
            quantity: value.entry.amount.into_decimal(),
            account_id: value.entry.account_id.0,
        }
    }
}

// ---------------------------------------------------------------------------
// From impls: DTO → view model (outbound path)
// ---------------------------------------------------------------------------

/// Converts an `EntryDto` into an `AccountAssetEntryViewModel` (`AccountAssetEntry<Amount>`).
/// Only implemented for the unvalidated `Amount` wrapper because outbound
/// conversion is infallible (the data already exists in the DB).
impl From<EntryDto> for AccountAssetEntryViewModel {
    fn from(entry: EntryDto) -> Self {
        AccountAssetEntry {
            account_id: RequiredAccountId(entry.account_id),
            asset_id: RequiredAssetId(entry.asset_id),
            amount: Amount(entry.quantity),
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
