use sea_query::Iden;

#[allow(dead_code)]
pub enum PortfolioIden {
    Table,
    Id,
    UserId,
    AssetId,
    AccountId,
    Sum,
}

#[allow(dead_code)]
pub enum PortfolioAccountIden {
    Table,
    Id,
    UserId,
    Name,
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
                Self::AccountId => "account_id",
                Self::Sum => "sum",
            }
        )
        .unwrap();
    }
}

impl Iden for PortfolioAccountIden {
    fn unquoted(&self, s: &mut dyn std::fmt::Write) {
        write!(
            s,
            "{}",
            match self {
                Self::Table => "portfolio_account",
                Self::Id => "id",
                Self::UserId => "user_id",
                Self::Name => "name",
            }
        )
        .unwrap();
    }
}
