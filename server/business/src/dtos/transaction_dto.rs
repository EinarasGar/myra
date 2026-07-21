use time::OffsetDateTime;
use uuid::Uuid;

use crate::entities::transactions::transaction_types::TransactionTypes;

use super::{entry_dto::EntryDto, fee_entry_dto::FeeEntryDto};

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum TransactionVisibilityDto {
    #[default]
    Default,
    Ghost,
    Hidden,
}

impl TransactionVisibilityDto {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Default => "default",
            Self::Ghost => "ghost",
            Self::Hidden => "hidden",
        }
    }

    pub fn from_db_str(s: &str) -> Option<Self> {
        match s {
            "default" => Some(Self::Default),
            "ghost" => Some(Self::Ghost),
            "hidden" => Some(Self::Hidden),
            _ => None,
        }
    }
}

#[derive(Clone, Debug)]
pub struct TransactionDto {
    pub transaction_id: Option<Uuid>,
    pub date: OffsetDateTime,
    pub visibility: TransactionVisibilityDto,
    pub fee_entries: Vec<FeeEntryDto>,
    pub transaction_type: TransactionTypeDto,
}

#[derive(Clone, Debug)]
pub enum TransactionTypeDto {
    Regular(RegularTransactionMetadataDto),
    AssetPurchase(AssetPurchaseMetadataDto),
    AssetSale(AssetSaleMetadataDto),
    CashTransferIn(CashTransferInMetadataDto),
    CashTransferOut(CashTransferOutMetadataDto),
    CashDividend(CashDividendMetadataDto),
    AssetDividend(AssetDividendMetadataDto),
    AssetTransferOut(AssetTransferOutMetadataDto),
    AssetTransferIn(AssetTransferInMetadataDto),
    AssetTrade(AssetTradeMetadataDto),
    AssetBalanceTransfer(AssetBalanceTransferMetadataDto),
    AccountFees(AccountFeesMetadataDto),
    CashBalanceTransfer(CashBalanceTransferMetadataDto),
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

#[derive(Clone, Debug)]
pub struct AssetSaleMetadataDto {
    pub sale: EntryDto,
    pub proceeds: EntryDto,
}

#[derive(Clone, Debug)]
pub struct CashTransferInMetadataDto {
    pub entry: EntryDto,
}

#[derive(Clone, Debug)]
pub struct CashTransferOutMetadataDto {
    pub entry: EntryDto,
}

#[derive(Clone, Debug)]
pub struct CashDividendMetadataDto {
    pub entry: EntryDto,
    pub origin_asset_id: i32,
}

#[derive(Clone, Debug)]
pub struct AssetDividendMetadataDto {
    pub entry: EntryDto,
}

#[derive(Clone, Debug)]
pub struct AssetTransferOutMetadataDto {
    pub entry: EntryDto,
}

#[derive(Clone, Debug)]
pub struct AssetTransferInMetadataDto {
    pub entry: EntryDto,
}

#[derive(Clone, Debug)]
pub struct AssetTradeMetadataDto {
    pub outgoing_entry: EntryDto,
    pub incoming_entry: EntryDto,
}

#[derive(Clone, Debug)]
pub struct AssetBalanceTransferMetadataDto {
    pub outgoing_change: EntryDto,
    pub incoming_change: EntryDto,
}

#[derive(Clone, Debug)]
pub struct AccountFeesMetadataDto {
    pub entry: EntryDto,
}

#[derive(Clone, Debug)]
pub struct CashBalanceTransferMetadataDto {
    pub outgoing_change: EntryDto,
    pub incoming_change: EntryDto,
}

impl From<TransactionTypeDto> for TransactionTypes {
    fn from(value: TransactionTypeDto) -> Self {
        match value {
            TransactionTypeDto::Regular(_) => TransactionTypes::RegularTransaction,
            TransactionTypeDto::AssetPurchase(_) => TransactionTypes::AssetPurchase,
            TransactionTypeDto::AssetSale(_) => TransactionTypes::AssetSale,
            TransactionTypeDto::CashTransferIn(_) => TransactionTypes::CashTransferIn,
            TransactionTypeDto::CashTransferOut(_) => TransactionTypes::CashTransferOut,
            TransactionTypeDto::CashDividend(_) => TransactionTypes::CashDividend,
            TransactionTypeDto::AssetDividend(_) => TransactionTypes::AssetDividend,
            TransactionTypeDto::AssetTransferOut(_) => TransactionTypes::AssetTransferOut,
            TransactionTypeDto::AssetTransferIn(_) => TransactionTypes::AssetTransferIn,
            TransactionTypeDto::AssetTrade(_) => TransactionTypes::AssetTrade,
            TransactionTypeDto::AssetBalanceTransfer(_) => TransactionTypes::AssetBalanceTransfer,
            TransactionTypeDto::AccountFees(_) => TransactionTypes::AccountFees,
            TransactionTypeDto::CashBalanceTransfer(_) => TransactionTypes::CashBalanceTransfer,
        }
    }
}
