use sea_query::Iden;

#[allow(dead_code)]
pub enum AccountIden {
    Table,
    Id,
    UserId,
    AccountName,
    LiquidityType,
    AccountType,
    Active,
    OwnershipShare,
}

impl Iden for AccountIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "account",
            Self::Id => "id",
            Self::UserId => "user_id",
            Self::AccountName => "account_name",
            Self::AccountType => "account_type",
            Self::LiquidityType => "liquidity_type",
            Self::Active => "active",
            Self::OwnershipShare => "ownership_share",
        }
    }
}

#[allow(dead_code)]
pub enum AccountTypesIden {
    Table,
    Id,
    AccountTypeName,
}

impl Iden for AccountTypesIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "account_types",
            Self::Id => "id",
            Self::AccountTypeName => "account_type_name",
        }
    }
}

#[allow(dead_code)]
pub enum AccountLiquidityTypesIden {
    Table,
    Id,
    LiquidityTypeName,
}

impl Iden for AccountLiquidityTypesIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "account_liquidity_types",
            Self::Id => "id",
            Self::LiquidityTypeName => "liquidity_type_name",
        }
    }
}

#[allow(dead_code)]
pub enum AccountsAliasIden {
    SuggestedCurrencySubquery,
}

impl Iden for AccountsAliasIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::SuggestedCurrencySubquery => "suggested_currency",
        }
    }
}

#[allow(dead_code)]
pub enum SuggestedCurrencyIden {
    Id,
    Ticker,
    Name,
    AssetType,
}

impl Iden for SuggestedCurrencyIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Id => "suggested_currency_id",
            Self::Ticker => "suggested_currency_ticker",
            Self::Name => "suggested_currency_name",
            Self::AssetType => "suggested_currency_type",
        }
    }
}
