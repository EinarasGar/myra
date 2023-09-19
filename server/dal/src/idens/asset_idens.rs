use sea_query::Iden;

#[allow(dead_code)]
pub enum AssetsAliasIden {
    BasePairsSubquery,
    PairsSubquery,
    FilteredPairsSubquery,
}

#[allow(dead_code)]
pub enum AssetsIden {
    Table,
    Id,
    AssetType,
    Name,
    Ticker,
    BasePairId,
}

#[allow(dead_code)]
pub enum AssetTypesIden {
    Table,
    Id,
    Name,
}

#[allow(dead_code)]
pub enum AssetPairsIden {
    Table,
    Id,
    Pair1,
    Pair2,
}

#[allow(dead_code)]
pub enum AssetHistoryIden {
    Table,
    Id,
    PairId,
    Rate,
    Date,
}

impl Iden for AssetsAliasIden {
    fn unquoted(&self, s: &mut dyn std::fmt::Write) {
        write!(
            s,
            "{}",
            match self {
                Self::BasePairsSubquery => "base_pairs",
                Self::PairsSubquery => "pairs",
                Self::FilteredPairsSubquery => "filtered",
            }
        )
        .unwrap();
    }
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
                Self::BasePairId => "base_pair_id",
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

impl Iden for AssetPairsIden {
    fn unquoted(&self, s: &mut dyn std::fmt::Write) {
        write!(
            s,
            "{}",
            match self {
                Self::Table => "asset_pairs",
                Self::Id => "id",
                Self::Pair1 => "pair1",
                Self::Pair2 => "pair2",
            }
        )
        .unwrap();
    }
}

impl Iden for AssetHistoryIden {
    fn unquoted(&self, s: &mut dyn std::fmt::Write) {
        write!(
            s,
            "{}",
            match self {
                Self::Table => "asset_history",
                Self::Id => "id",
                Self::PairId => "pair_id",
                Self::Rate => "rate",
                Self::Date => "date",
            }
        )
        .unwrap();
    }
}
