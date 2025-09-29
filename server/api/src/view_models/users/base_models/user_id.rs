use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct RequiredUserId(pub Uuid);

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UserId(pub Option<Uuid>);
