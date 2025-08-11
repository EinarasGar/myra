use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct RequiredTransactionId(pub Uuid);

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct TransactionId(pub Option<Uuid>);
