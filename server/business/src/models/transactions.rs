use rust_decimal::Decimal;
use time::PrimitiveDateTime;

pub struct TransactonDto {
    pub asset_id: i32,
    pub quantity: Decimal,
    pub category: i32,
    pub date: PrimitiveDateTime,
    pub description: Option<String>,
}
pub struct AddTransactionGroupDto {
    pub transactions: Vec<TransactonDto>,
}
