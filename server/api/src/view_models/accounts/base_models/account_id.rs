use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct RequiredAccountId(pub Uuid);

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct AccountId(pub Option<Uuid>);
