use sqlx::types::{time::OffsetDateTime, Decimal, Uuid};

//Used to retrieve transactions joined with group info and descriptions
#[derive(Clone, Debug, sqlx::FromRow)]
pub struct TransactionWithGroupModel {
    pub id: i32,
    pub user_id: Uuid,
    pub group_id: Uuid,
    pub asset_id: i32,
    pub category_id: i32,
    pub quantity: Decimal,
    pub date: OffsetDateTime,
    pub account_id: Uuid,
    pub account_name: String,
    pub description: Option<String>,
    pub group_description: String,
    pub group_category_id: i32,
    pub date_added: OffsetDateTime,
    pub link_id: Option<Uuid>,
}

#[derive(Clone, Debug, sqlx::FromRow)]
pub struct TransactionFinancials {
    pub asset_id: i32,
    pub account_id: Uuid,
    pub quantity: Decimal,
    pub date: OffsetDateTime,
}

//Used in a method to insert new transactions
#[derive(Clone, Debug)]
pub struct AddUpdateTransactionModel {
    pub user_id: Uuid,
    pub group_id: Uuid,
    pub asset_id: i32,
    pub category_id: i32,
    pub quantity: Decimal,
    pub date: OffsetDateTime,
    pub account_id: Uuid,
    pub link_id: Option<Uuid>,
}

#[derive(Clone, Debug)]
pub struct AddTransactionDescriptionModel {
    pub transaction_id: i32,
    pub description: String,
}

//Used in a method to insert new transaction groups
#[derive(Clone, Debug, PartialEq)]
pub struct AddUpdateTransactionGroupModel {
    pub group_id: Uuid,
    pub category_id: i32,
    pub description: String,
    pub date: OffsetDateTime,
}

#[derive(Clone, Debug, sqlx::FromRow)]
pub struct CategoryModel {
    pub id: i32,
    pub category: String,
    pub icon: String,
}
