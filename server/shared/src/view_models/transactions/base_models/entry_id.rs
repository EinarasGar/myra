use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct RequiredEntryId(pub i32);

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct EntryId(pub Option<i32>);
