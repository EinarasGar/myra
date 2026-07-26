#[cfg(feature = "backend")]
use business::dtos::connectors::ProviderAccountTransactionDto;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use time::serde::timestamp;
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct ProviderAccountTransactionViewModel {
    #[serde(with = "timestamp")]
    #[schema(value_type = i64)]
    pub date: time::OffsetDateTime,
    pub description: String,
    #[serde(with = "rust_decimal::serde::arbitrary_precision")]
    #[schema(value_type = f64)]
    pub amount: Decimal,
    pub currency: String,
    pub asset_identifier: Option<String>,
    #[serde(default, with = "rust_decimal::serde::arbitrary_precision_option")]
    #[schema(value_type = Option<f64>)]
    pub quantity: Option<Decimal>,
}

#[cfg(feature = "backend")]
impl From<ProviderAccountTransactionDto> for ProviderAccountTransactionViewModel {
    fn from(dto: ProviderAccountTransactionDto) -> Self {
        Self {
            date: dto.date,
            description: dto.description,
            amount: dto.amount,
            currency: dto.currency,
            asset_identifier: dto.asset_identifier,
            quantity: dto.quantity,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct ListProviderAccountTransactionsResponseViewModel {
    pub transactions: Vec<ProviderAccountTransactionViewModel>,
}
