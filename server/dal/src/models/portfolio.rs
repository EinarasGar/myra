use sea_query::Iden;

pub enum SqlCols {
    Exclude,
}

impl Iden for SqlCols {
    fn unquoted(&self, s: &mut dyn std::fmt::Write) {
        write!(
            s,
            "{}",
            match self {
                Self::Exclude => "excluded",
            }
        )
        .unwrap();
    }
}

pub enum Portfolio {
    Table,
    Id,
    UserId,
    AssetId,
    Sum,
}

impl Iden for Portfolio {
    fn unquoted(&self, s: &mut dyn std::fmt::Write) {
        write!(
            s,
            "{}",
            match self {
                Self::Table => "portfolio",
                Self::Id => "id",
                Self::UserId => "user_id",
                Self::AssetId => "asset_id",
                Self::Sum => "sum",
            }
        )
        .unwrap();
    }
}
