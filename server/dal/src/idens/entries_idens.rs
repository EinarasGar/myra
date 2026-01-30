use sea_query::Iden;

pub enum EntryIden {
    Table,
    Id,
    AssetId,
    AccountId,
    Quantity,
    CategoryId,
    TransactionId,
}

impl Iden for EntryIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "entry",
            Self::Id => "id",
            Self::AssetId => "asset_id",
            Self::AccountId => "account_id",
            Self::Quantity => "quantity",
            Self::CategoryId => "category_id",
            Self::TransactionId => "transaction_id",
        }
    }
}

#[derive(Iden)]
pub enum BinnedEntriesIden {
    ScopedSubquery,
    Sum,
    StartTime,
}
