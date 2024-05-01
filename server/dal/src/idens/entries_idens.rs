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
    fn unquoted(&self, s: &mut dyn std::fmt::Write) {
        write!(
            s,
            "{}",
            match self {
                Self::Table => "entry",
                Self::Id => "id",
                Self::AssetId => "asset_id",
                Self::AccountId => "account_id",
                Self::Quantity => "quantity",
                Self::CategoryId => "category_id",
                Self::TransactionId => "transaction_id",
            }
        )
        .unwrap();
    }
}
