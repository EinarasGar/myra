use sqlx::types::Uuid;

#[derive(sqlx::FromRow)]
pub struct TransactionDescriptionModel {
    pub transaction_id: Uuid,
    pub description: String,
}
