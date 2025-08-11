use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::view_models::transactions::base_models::transaction_group::RequiredIdentifiableTransactionGroupViewModel;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct GetTransactionGroupLineResponseViewModel {
    #[serde(flatten)]
    pub transaction_group: RequiredIdentifiableTransactionGroupViewModel,
}
