use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct RequiredTransactionId(pub Uuid);

#[derive(Clone, Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct TransactionId(pub Option<Uuid>);
