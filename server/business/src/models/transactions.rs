use rust_decimal::Decimal;
use time::PrimitiveDateTime;

pub struct Transaction {
    pub asset_id: i32,
    pub quantity: Decimal,
    pub category: i32,
    pub date: PrimitiveDateTime,
    pub description: Option<String>,
}
pub struct AddTransactionGroup {
    pub transactions: Vec<Transaction>,
}
