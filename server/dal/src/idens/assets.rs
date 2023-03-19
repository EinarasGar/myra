use sea_query::Iden;

#[allow(dead_code)]
pub enum AssetsIden {
    Table,
    Id,
    AssetType,
    Name,
    Ticker,
}

#[allow(dead_code)]
pub enum AssetTypesIden {
    Table,
    Id,
    Name,
}

impl Iden for AssetsIden {
    fn unquoted(&self, s: &mut dyn std::fmt::Write) {
        write!(
            s,
            "{}",
            match self {
                Self::Table => "assets",
                Self::Id => "id",
                Self::AssetType => "asset_type",
                Self::Name => "name",
                Self::Ticker => "ticker",
            }
        )
        .unwrap();
    }
}

impl Iden for AssetTypesIden {
    fn unquoted(&self, s: &mut dyn std::fmt::Write) {
        write!(
            s,
            "{}",
            match self {
                Self::Table => "asset_types",
                Self::Id => "id",
                Self::Name => "name",
            }
        )
        .unwrap();
    }
}
