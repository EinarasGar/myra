use sea_query::Iden;

pub mod assets;
pub(crate) mod portfolio;
pub(crate) mod transaction;
pub(crate) mod users;

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
