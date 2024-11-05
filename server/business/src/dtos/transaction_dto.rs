use time::OffsetDateTime;
use uuid::Uuid;

use crate::entities::transactions::transaction_types::TransactionTypes;

use super::{entry_dto::EntryDto, fee_entry_dto::FeeEntryDto};

#[derive(Clone, Debug)]
pub struct TransactionDto {
    pub transaction_id: Option<Uuid>,
    pub date: OffsetDateTime,
    pub fee_entries: Vec<FeeEntryDto>,
    pub transaction_type: TransactionTypeDto,
}

#[derive(Clone, Debug)]
pub enum TransactionTypeDto {
    Regular(RegularTransactionMetadataDto),
    AssetPurchase(AssetPurchaseMetadataDto),
}

#[derive(Clone, Debug)]
pub struct RegularTransactionMetadataDto {
    pub description: Option<String>,
    pub entry: EntryDto,
    pub category_id: i32,
}

#[derive(Clone, Debug)]
pub struct AssetPurchaseMetadataDto {
    pub purchase: EntryDto,
    pub sale: EntryDto,
}

impl From<TransactionTypeDto> for TransactionTypes {
    fn from(value: TransactionTypeDto) -> Self {
        match value {
            TransactionTypeDto::Regular(_) => TransactionTypes::RegularTransaction,
            TransactionTypeDto::AssetPurchase(_) => TransactionTypes::AssetPurchase,
        }
    }
}
