use dal::models::user_models::{UserFullModel, UserRoleModel};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::user_role_dto::UserRoleDto;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UserFullDto {
    pub id: Uuid,
    pub username: String,
    pub role: UserRoleDto,
    pub default_asset_id: i32,
}

impl From<UserFullModel> for UserFullDto {
    fn from(p: UserFullModel) -> Self {
        Self {
            id: p.id,
            username: p.username,
            role: UserRoleModel {
                id: p.role_id,
                name: p.role_name,
            }
            .into(),
            default_asset_id: p.default_asset,
        }
    }
}
