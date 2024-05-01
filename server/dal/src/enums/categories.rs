#[derive(Clone, Debug)]
pub enum FeeCategories {
    Transaction = 1,
    Exchange = 2,
}

impl TryFrom<i32> for FeeCategories {
    type Error = ();

    fn try_from(v: i32) -> Result<Self, Self::Error> {
        match v {
            x if x == FeeCategories::Transaction as i32 => Ok(FeeCategories::Transaction),
            x if x == FeeCategories::Exchange as i32 => Ok(FeeCategories::Exchange),
            _ => Err(()),
        }
    }
}
