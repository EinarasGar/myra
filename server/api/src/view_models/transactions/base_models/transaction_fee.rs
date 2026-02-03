use business::dtos::{
    entry_dto::EntryDto, fee_entry_dto::FeeEntryDto, fee_entry_types_dto::FeeEntryTypesDto,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::account_asset_entry::{
    AccountAssetEntryViewModel, IdentifiableAccountAssetEntryViewModel,
    RequiredIdentifiableAccountAssetEntryViewModel,
};

pub type TransactionFeeViewModel = TransactionFee<AccountAssetEntryViewModel>;
pub type IdentifiableTransactionFeeViewModel =
    TransactionFee<IdentifiableAccountAssetEntryViewModel>;
pub type RequiredIdentifiableTransactionFeeViewModel =
    TransactionFee<RequiredIdentifiableAccountAssetEntryViewModel>;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct TransactionFee<E> {
    #[serde(flatten)]
    pub entry: E,

    /// The type of fee related to a transaction.
    pub fee_type: TransactionFeeType,
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum TransactionFeeType {
    Transaction,
    Exchange,
    WithholdingTax,
}

impl From<TransactionFeeType> for FeeEntryTypesDto {
    fn from(value: TransactionFeeType) -> Self {
        match value {
            TransactionFeeType::Transaction => FeeEntryTypesDto::Transaction,
            TransactionFeeType::Exchange => FeeEntryTypesDto::Exchange,
            TransactionFeeType::WithholdingTax => FeeEntryTypesDto::WithholdingTax,
        }
    }
}

impl From<FeeEntryTypesDto> for TransactionFeeType {
    fn from(value: FeeEntryTypesDto) -> Self {
        match value {
            FeeEntryTypesDto::Transaction => TransactionFeeType::Transaction,
            FeeEntryTypesDto::Exchange => TransactionFeeType::Exchange,
            FeeEntryTypesDto::WithholdingTax => TransactionFeeType::WithholdingTax,
        }
    }
}

impl<E> From<TransactionFee<E>> for FeeEntryDto
where
    E: Into<EntryDto>,
{
    fn from(value: TransactionFee<E>) -> Self {
        FeeEntryDto {
            entry: value.entry.into(),
            entry_type: value.fee_type.into(),
        }
    }
}

impl<E> From<FeeEntryDto> for TransactionFee<E>
where
    E: From<EntryDto>,
{
    fn from(value: FeeEntryDto) -> Self {
        Self {
            entry: value.entry.into(),
            fee_type: value.entry_type.into(),
        }
    }
}
