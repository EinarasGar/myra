use bitflags::bitflags;
use derivative::Derivative;

#[derive(Derivative, Debug)]
pub enum MetadataField {
    Description(Option<String>),
    Dividends(Option<i32>),
}

bitflags! {
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct MetadataKinds: u8 {
        const DESCRIPTIONS = 1 << 0;
        const DIVIDENDS = 1 << 1;
    }
}
