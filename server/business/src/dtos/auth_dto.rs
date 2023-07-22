use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::user_role_dto::UserRoleEnumDto;

#[derive(Debug, Serialize, Deserialize)]
pub struct ClaimsDto {
    #[serde(with = "Uuid")]
    pub sub: Uuid,
    pub role: UserRoleEnumDto,
    pub exp: u64,
}
