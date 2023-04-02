use sea_query::Iden;

pub mod asset_idens;
pub(crate) mod portfolio_idens;
pub(crate) mod transaction_idens;
pub(crate) mod user_idens;

pub enum CommonsIden {
    Excluded,
}

impl Iden for CommonsIden {
    fn unquoted(&self, s: &mut dyn std::fmt::Write) {
        write!(
            s,
            "{}",
            match self {
                Self::Excluded => "excluded",
            }
        )
        .unwrap();
    }
}
