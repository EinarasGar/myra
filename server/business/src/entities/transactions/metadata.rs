use bitflags::bitflags;
use derivative::Derivative;
use uuid::Uuid;

#[derive(Derivative, Debug)]
pub enum MetadataField {
    Description(Option<String>),
    Dividends(Option<i32>),
}

#[derive(Debug, Clone)]
pub struct ConnectorLinkMeta {
    pub binding_id: Uuid,
    pub external_id: String,
    pub external_hash: String,
}

bitflags! {
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub struct MetadataKinds: u8 {
        const DESCRIPTIONS = 1 << 0;
        const DIVIDENDS = 1 << 1;
    }
}
