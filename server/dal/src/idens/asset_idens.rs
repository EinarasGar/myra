use sea_query::Iden;

#[allow(dead_code)]
pub enum AssetsAliasIden {
    BasePairsSubquery,
    PairsSubquery,
    FilteredPairsSubquery,
    BaseAssetJoin,
    BaseAssetTypeJoin,
    PairsDatesList,
    PairIdsDatesList,
}

#[allow(dead_code)]
pub enum AssetsIden {
    Table,
    Id,
    AssetType,
    AssetName,
    Ticker,
    BasePairId,
    UserId,
}

#[allow(dead_code)]
pub enum AssetTypesIden {
    Table,
    Id,
    AssetTypeName,
}

#[allow(dead_code)]
pub enum AssetPairsIden {
    Table,
    Id,
    Pair1,
    Pair2,
}

#[allow(dead_code)]
pub enum AssetPairSharedMetadataIden {
    Table,
    Id,
    Volume,
}

#[allow(dead_code)]
pub enum AssetPairUserMetadataIden {
    Table,
    Id,
    Exchange,
}

#[allow(dead_code)]
pub enum AssetHistoryIden {
    Table,
    Id,
    PairId,
    Rate,
    RecordedAt,
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
                Self::BaseAssetJoin => "base_assets",
                Self::BaseAssetTypeJoin => "base_assets_types",
                Self::PairsDatesList => "pairs_dates_list",
                Self::PairIdsDatesList => "pair_ids_dates_list",
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
                Self::AssetName => "asset_name",
                Self::Ticker => "ticker",
                Self::BasePairId => "base_pair_id",
                Self::UserId => "user_id",
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
                Self::AssetTypeName => "asset_type_name",
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
                Self::RecordedAt => "recorded_at",
            }
        )
        .unwrap();
    }
}

impl Iden for AssetPairSharedMetadataIden {
    fn unquoted(&self, s: &mut dyn std::fmt::Write) {
        write!(
            s,
            "{}",
            match self {
                Self::Table => "asset_pairs_shared_metadata",
                Self::Id => "pair_id",
                Self::Volume => "volume",
            }
        )
        .unwrap();
    }
}

impl Iden for AssetPairUserMetadataIden {
    fn unquoted(&self, s: &mut dyn std::fmt::Write) {
        write!(
            s,
            "{}",
            match self {
                Self::Table => "asset_pair_user_metadata",
                Self::Id => "id",
                Self::Exchange => "exchange",
            }
        )
        .unwrap();
    }
}
