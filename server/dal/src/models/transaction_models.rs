use sqlx::types::{time::OffsetDateTime, Decimal, Uuid};

use crate::enums::{
    fee_categories::DatabaseFeeCategories,
    transaction_type_categories::DatabaseTransactionTypeCategories,
    transaction_types::DatabaseTransactionTypes,
};

#[derive(PartialEq)]
pub struct AddTransactionModel {
    pub user_id: Uuid,
    pub group_id: Option<Uuid>,
    pub date: OffsetDateTime,
    pub transaction_type_id: i32,
    pub visibility: String,
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
    pub visibility: String,
}

#[derive(sqlx::FromRow, Debug)]
pub struct TransactionDescriptionModel {
    pub transaction_id: Uuid,
    pub description: String,
}

#[derive(Clone)]
pub struct AddTransactionDividendModel {
    pub transaction_id: Uuid,
    pub source_asset_id: i32,
}

#[derive(sqlx::FromRow, Debug)]
pub struct TransactionDividendModel {
    pub transaction_id: Uuid,
    pub source_asset_id: i32,
}

#[derive(sqlx::FromRow, Debug)]
pub struct TransactionGroupModel {
    pub id: Uuid,
    pub category_id: i32,
    pub description: String,
    pub date_added: OffsetDateTime,
}

pub struct AddTransactionGroupModel {
    pub category_id: i32,
    pub description: String,
    pub date_added: OffsetDateTime,
}

pub struct UpdateTransactionGroupModel {
    pub id: Uuid,
    pub category_id: i32,
    pub description: String,
    pub date_added: OffsetDateTime,
}

#[derive(sqlx::FromRow, Debug)]
pub struct TransactionIdWithGroupModel {
    pub id: Uuid,
    pub group_id: Uuid,
}

#[derive(sqlx::FromRow, Debug)]
pub struct CombinedTransactionIdModel {
    pub id: Uuid,
    pub item_type: String,
}

pub struct UpdateEntryModel {
    pub asset_id: i32,
    pub account_id: Uuid,
    pub quantity: Decimal,
    pub category_id: i32,
}

pub struct UpdateTransactionFieldsModel {
    pub date: OffsetDateTime,
    pub transaction_type_id: i32,
}

#[derive(sqlx::FromRow, Debug)]
pub struct LedgerExportRow {
    pub entry_id: i32,
    pub transaction_id: Uuid,
    pub user_id: Uuid,
    pub type_id: DatabaseTransactionTypes,
    pub date_transacted: OffsetDateTime,
    pub visibility: String,
    pub group_id: Option<Uuid>,
    pub entry_quantity: Decimal,
    pub entry_account_id: Uuid,
    pub entry_asset_id: i32,
    pub entry_category_id: i32,
    pub category_name: Option<String>,
    pub category_type_name: Option<String>,
    pub asset_ticker: Option<String>,
    pub asset_name: Option<String>,
    pub asset_type_name: Option<String>,
    pub asset_user_id: Option<Uuid>,
    pub asset_base_pair_id: Option<i32>,
    pub base_pair_ticker: Option<String>,
    pub account_name: Option<String>,
    pub account_type_name: Option<String>,
    pub description: Option<String>,
    pub dividend_source_asset_id: Option<i32>,
    pub group_description: Option<String>,
    pub group_category_name: Option<String>,
    pub group_category_type_name: Option<String>,
}
