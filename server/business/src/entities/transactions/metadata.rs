use std::{future::Future, pin::Pin};

use derivative::Derivative;

use crate::service_collection::transaction_metadata_service::TransactionMetadataService;

use super::transaction::{Transaction, Transcation};

#[derive(Derivative, Debug)]
pub enum MetadataField {
    Description(Option<String>),
    Dividends,
}
