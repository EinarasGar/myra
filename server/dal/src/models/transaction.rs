use sea_query::Iden;
use sqlx::types::{Decimal, Uuid};
use time::{OffsetDateTime, PrimitiveDateTime};

#[derive(Clone)]
pub struct TransactionModel {
    pub id: i32,
    pub user_id: Uuid,
    pub group_id: Uuid,
    pub asset_id: i32,
    pub category_id: i32,
    pub quantity: Decimal,
    pub date: PrimitiveDateTime,
}

pub enum Transaction {
    Table,
    Id,
    UserId,
    GroupId,
    AssetId,
    CategoryId,
    Quantity,
    Date,
}

pub enum TransactionCategories {
    Table,
    Id,
    Category,
}

pub enum TransactionDescriptions {
    Table,
    TransactionId,
    Description,
}

impl Iden for Transaction {
    fn unquoted(&self, s: &mut dyn std::fmt::Write) {
        write!(
            s,
            "{}",
            match self {
                Self::Table => "transaction",
                Self::Id => "id",
                Self::UserId => "user_id",
                Self::GroupId => "group_id",
                Self::AssetId => "asset_id",
                Self::CategoryId => "category_id",
                Self::Quantity => "quantity",
                Self::Date => "date",
            }
        )
        .unwrap();
    }
}

impl Iden for TransactionCategories {
    fn unquoted(&self, s: &mut dyn std::fmt::Write) {
        write!(
            s,
            "{}",
            match self {
                Self::Table => "transaction_categories",
                Self::Id => "id",
                Self::Category => "category",
            }
        )
        .unwrap();
    }
}

impl Iden for TransactionDescriptions {
    fn unquoted(&self, s: &mut dyn std::fmt::Write) {
        write!(
            s,
            "{}",
            match self {
                Self::Table => "transaction_categories",
                Self::TransactionId => "transaction_id",
                Self::Description => "description",
            }
        )
        .unwrap();
    }
}
