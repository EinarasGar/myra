use sea_query::{Iden, Write};

pub mod account_idens;
pub mod asset_idens;
pub mod entries_idens;
pub(crate) mod transaction_idens;
pub(crate) mod user_idens;

#[allow(dead_code)]
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

pub struct Unnest;

impl Iden for Unnest {
    fn unquoted(&self, s: &mut dyn Write) {
        write!(s, "unnest").unwrap();
    }
}

pub struct Over;

impl Iden for Over {
    fn unquoted(&self, s: &mut dyn Write) {
        write!(s, "over").unwrap();
    }
}

#[derive(Iden)]
#[iden = "ARRAY"]
pub struct ArrayFunc;
