use connectors::models::transaction::ProviderTransaction;
use rust_decimal::Decimal;
use time::OffsetDateTime;

#[derive(Clone, Debug)]
pub struct ProviderAccountTransactionDto {
    pub date: OffsetDateTime,
    pub description: String,
    pub amount: Decimal,
    pub currency: String,
    pub asset_identifier: Option<String>,
    pub quantity: Option<Decimal>,
}

impl From<ProviderTransaction> for ProviderAccountTransactionDto {
    fn from(tx: ProviderTransaction) -> Self {
        Self {
            date: tx.date,
            description: tx.description,
            amount: tx.amount,
            currency: tx.currency,
            asset_identifier: tx.asset_identifier,
            quantity: tx.quantity,
        }
    }
}
