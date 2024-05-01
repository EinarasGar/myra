use time::OffsetDateTime;
use uuid::Uuid;

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
    AssetPurchase,
}

#[derive(Clone, Debug)]
pub struct RegularTransactionMetadataDto {
    pub description: Option<String>,
    pub entry: EntryDto,
    pub category_id: i32,
}

// {
//     "date": "2019-08-24T14:15:22Z",
//     "type": {
//       "type": "regular_transaction",
//       "description": "string"
//     },
//     "entries": [
//       {
//         "category_id": 0,
//         "account_id": "449e7a5c-69d3-4b8a-aaaf-5c9b713ebc65",
//         "amount": 0,
//         "asset_id": 0
//       }
//     ]
//   }
