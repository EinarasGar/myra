use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct DeleteTransactionsRequestViewModel {
    pub transaction_ids: Vec<Uuid>,
    pub group_ids: Vec<Uuid>,
}
