use sea_query::{Func, FunctionCall, Iden, IntoColumnRef, SimpleExpr, Write};
use time::{Duration, OffsetDateTime};

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

#[derive(Iden)]
#[iden = "date_bin"]
pub struct DateBin;

pub struct CustomFunc {}

impl CustomFunc {
    pub fn date_bin(duration: Duration, val: SimpleExpr) -> FunctionCall {
        Func::cust(DateBin).args(vec![
            CustomFunc::interval(duration),
            val,
            SimpleExpr::Custom("'epoch'".into()),
        ])
    }

    pub fn date_bin_col<C>(duration: Duration, col: C) -> FunctionCall
    where
        C: IntoColumnRef,
    {
        Self::date_bin(duration, SimpleExpr::Column(col.into_column_ref()))
    }

    pub fn date_bin_time(duration: Duration, time: OffsetDateTime) -> FunctionCall {
        Self::date_bin(duration, SimpleExpr::Value(time.into()))
    }

    pub fn interval(duration: Duration) -> SimpleExpr {
        SimpleExpr::Custom(format!("interval '{} seconds'", duration.whole_seconds()).into())
    }
}
