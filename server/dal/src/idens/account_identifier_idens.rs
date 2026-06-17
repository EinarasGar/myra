use sea_query::Iden;

#[allow(dead_code)]
pub enum AccountIdentifierIden {
    Table,
    Id,
    AccountId,
    Kind,
    Value,
}

impl Iden for AccountIdentifierIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "account_identifier",
            Self::Id => "id",
            Self::AccountId => "account_id",
            Self::Kind => "kind",
            Self::Value => "value",
        }
    }
}
