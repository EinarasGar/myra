use business::dtos::{fee_entry_dto::FeeEntryDto, fee_entry_types_dto::FeeEntryTypesDto};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::account_asset_entry::{
    AccountAssetEntryViewModel, IdentifiableAccountAssetEntryViewModel,
    MandatoryIdentifiableAccountAssetEntryViewModel,
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[aliases(
    TransactionFeeViewModel = TransactionFee<AccountAssetEntryViewModel>, 
    IdentifiableTransactionFeeViewModel = TransactionFee<IdentifiableAccountAssetEntryViewModel>,
    MandatoryIdentifiableTransactionFeeViewModel = TransactionFee<MandatoryIdentifiableAccountAssetEntryViewModel>
)]
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
}

impl From<TransactionFeeType> for FeeEntryTypesDto {
    fn from(value: TransactionFeeType) -> Self {
        match value {
            TransactionFeeType::Transaction => FeeEntryTypesDto::Transaction,
            TransactionFeeType::Exchange => FeeEntryTypesDto::Exchange,
        }
    }
}

impl From<FeeEntryTypesDto> for TransactionFeeType {
    fn from(value: FeeEntryTypesDto) -> Self {
        match value {
            FeeEntryTypesDto::Transaction => TransactionFeeType::Transaction,
            FeeEntryTypesDto::Exchange => TransactionFeeType::Exchange,
        }
    }
}

impl From<MandatoryIdentifiableTransactionFeeViewModel> for FeeEntryDto {
    fn from(value: MandatoryIdentifiableTransactionFeeViewModel) -> Self {
        FeeEntryDto {
            entry: value.entry.into(),
            entry_type: value.fee_type.into(),
        }
    }
}

impl From<IdentifiableTransactionFeeViewModel> for FeeEntryDto {
    fn from(value: IdentifiableTransactionFeeViewModel) -> Self {
        FeeEntryDto {
            entry: value.entry.into(),
            entry_type: value.fee_type.into(),
        }
    }
}

impl From<TransactionFeeViewModel> for FeeEntryDto {
    fn from(value: TransactionFeeViewModel) -> Self {
        FeeEntryDto {
            entry: value.entry.into(),
            entry_type: value.fee_type.into(),
        }
    }
}

impl From<FeeEntryDto> for MandatoryIdentifiableTransactionFeeViewModel {
    fn from(value: FeeEntryDto) -> Self {
        MandatoryIdentifiableTransactionFeeViewModel {
            entry: value.entry.into(),
            fee_type: value.entry_type.into(),
        }
    }
}
