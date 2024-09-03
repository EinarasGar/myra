use business::dtos::transaction_dto::{
    RegularTransactionMetadataDto, TransactionDto, TransactionTypeDto,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::view_models::transactions::base_models::{
    account_asset_entry::{
        AccountAssetEntryViewModel, IdentifiableAccountAssetEntryViewModel,
        MandatoryIdentifiableAccountAssetEntryViewModel,
    },
    transaction_base::{
        IdentifiableTransactionBaseWithIdentifiableEntries,
        MandatoryIdentifiableTransactionBaseWithIdentifiableEntries,
        MandatoryTransactionBaseWithIdentifiableEntries, TransactionBaseWithEntries,
        TransactionBaseWithIdentifiableEntries,
    },
};

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
#[aliases(
    RegularTransactionViewModel = RegularTransaction<TransactionBaseWithEntries, AccountAssetEntryViewModel>,
    RegularTransactionWithIdentifiableEntriesViewModel = RegularTransaction<TransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>,
    MandatoryRegularTransactionWithIdentifiableEntriesViewModel = RegularTransaction<TransactionBaseWithIdentifiableEntries, MandatoryIdentifiableAccountAssetEntryViewModel>,
    IdentifiableRegularTransactionWithIdentifiableEntriesViewModel = RegularTransaction<IdentifiableTransactionBaseWithIdentifiableEntries, IdentifiableAccountAssetEntryViewModel>,
    MandatoryIdentifiableRegularTransactionWithIdentifiableEntriesViewModel = RegularTransaction<MandatoryIdentifiableTransactionBaseWithIdentifiableEntries, MandatoryIdentifiableAccountAssetEntryViewModel>,
)]
pub struct RegularTransaction<B, E> {
    #[serde(flatten)]
    pub base: B,

    /// Entry related to a transaction.
    pub entry: E,

    /// Specific bespoke category id.
    pub category_id: i32,

    /// Description of the transaction.
    pub description: Option<String>,
}

impl From<RegularTransactionViewModel> for TransactionDto {
    fn from(trans: RegularTransactionViewModel) -> Self {
        TransactionDto {
            transaction_id: None,
            date: trans.base.date,
            fee_entries: match trans.base.fees {
                Some(f) => f.into_iter().map(|x| x.into()).collect(),
                None => todo!(),
            },
            transaction_type: TransactionTypeDto::Regular(RegularTransactionMetadataDto {
                description: trans.description,
                entry: trans.entry.into(),
                category_id: trans.category_id,
            }),
        }
    }
}

impl From<TransactionDto>
    for MandatoryIdentifiableRegularTransactionWithIdentifiableEntriesViewModel
{
    fn from(value: TransactionDto) -> Self {
        if let TransactionTypeDto::Regular(r) = value.transaction_type {
            MandatoryIdentifiableRegularTransactionWithIdentifiableEntriesViewModel {
                base: MandatoryIdentifiableTransactionBaseWithIdentifiableEntries {
                    transaction_id: value
                        .transaction_id
                        .expect("Transaction Id mut not be None"),
                    base: MandatoryTransactionBaseWithIdentifiableEntries {
                        date: value.date,
                        fees: if value.fee_entries.len() > 0 {
                            Some(value.fee_entries.into_iter().map(|x| x.into()).collect())
                        } else {
                            None
                        },
                    },
                },
                entry: r.entry.into(),
                category_id: r.category_id,
                description: r.description,
            }
        } else {
            panic!("Can not convert TransactionDto into MandatoryIdentifiableRegularTransactionWithIdentifiableEntriesViewModel as the type is not Regular")
        }
    }
}

impl From<TransactionDto> for MandatoryRegularTransactionWithIdentifiableEntriesViewModel {
    fn from(value: TransactionDto) -> Self {
        if let TransactionTypeDto::Regular(r) = value.transaction_type {
            MandatoryRegularTransactionWithIdentifiableEntriesViewModel {
                base: TransactionBaseWithIdentifiableEntries {
                    date: value.date,
                    fees: if value.fee_entries.len() > 0 {
                        Some(value.fee_entries.into_iter().map(|x| x.into()).collect())
                    } else {
                        None
                    },
                },
                entry: r.entry.into(),
                category_id: r.category_id,
                description: r.description,
            }
        } else {
            panic!("Can not convert TransactionDto into MandatoryIdentifiableRegularTransactionWithIdentifiableEntriesViewModel as the type is not Regular")
        }
    }
}
