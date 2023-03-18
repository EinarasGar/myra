use sea_query::Iden;

#[allow(dead_code)]
pub enum PortfolioIden {
    Table,
    Id,
    UserId,
    AssetId,
    Sum,
}

impl Iden for PortfolioIden {
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
