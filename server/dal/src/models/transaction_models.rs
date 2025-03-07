use sqlx::types::{time::OffsetDateTime, Decimal, Uuid};

use crate::enums::{
    fee_categories::DatabaseFeeCategories,
    transaction_type_categories::DatabaseTransactionTypeCategories,
    transaction_types::DatabaseTransactionTypes,
};

pub struct AddTransactionModel {
    pub user_id: Uuid,
    pub group_id: Option<Uuid>,
    pub date: OffsetDateTime,
    pub transaction_type_id: i32,
}

#[derive(Clone)]
pub struct AddTransactionDescriptionModel {
    pub transaction_id: Uuid,
    pub description: String,
}

#[derive(sqlx::FromRow, Debug)]
pub struct TransactionCategoryFeeEnumModel {
    pub enum_index: DatabaseFeeCategories,
    pub category_mapping: i32,
}

#[derive(sqlx::FromRow, Debug)]
pub struct TransactionCategoryTransactionTypeEnumModel {
    pub enum_index: DatabaseTransactionTypeCategories,
    pub category_mapping: i32,
}

#[derive(sqlx::FromRow, Debug)]
pub struct TransactionWithEntriesModel {
    pub id: i32,
    pub asset_id: i32,
    pub account_id: Uuid,
    pub quantity: Decimal,
    pub category_id: i32,
    pub transaction_id: Uuid,
    pub user_id: Uuid,
    pub type_id: DatabaseTransactionTypes,
    pub date_transacted: OffsetDateTime,
}

#[derive(sqlx::FromRow, Debug)]
pub struct TransactionDescriptionModel {
    pub transaction_id: Uuid,
    pub description: String,
}
