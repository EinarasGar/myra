use sqlx::types::{Decimal, Uuid};

#[derive(sqlx::FromRow, Debug)]
pub struct Account {
    pub id: Uuid,
    pub user_id: Uuid,
    pub account_name: String,
    pub account_type: i32,
    pub ownership_share: Decimal,
}

#[derive(sqlx::FromRow, Debug)]
pub struct AccountWithMetadata {
    pub id: Uuid,
    pub user_id: Uuid,
    pub account_name: String,
    pub account_type: i32,
    pub account_type_name: String,
    pub liquidity_type: i32,
    pub liquidity_type_name: String,
    pub ownership_share: Decimal,
}

#[derive(sqlx::FromRow, Debug)]
pub struct AccountTypeModel {
    pub id: i32,
    pub account_type_name: String,
}

#[derive(sqlx::FromRow, Debug)]
pub struct AccountLiquidityTypeModel {
    pub id: i32,
    pub liquidity_type_name: String,
}

pub struct AccountUpdateModel {
    pub account_id: Uuid,
    pub user_id: Uuid,
    pub account_name: String,
    pub account_type: i32,
    pub liquidity_type: i32,
    pub ownership_share: Decimal,
}

pub struct AccountCreationModel {
    pub user_id: Uuid,
    pub account_name: String,
    pub account_type: i32,
    pub liquidity_type: i32,
    pub ownership_share: Decimal,
}
