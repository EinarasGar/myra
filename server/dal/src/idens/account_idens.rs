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
