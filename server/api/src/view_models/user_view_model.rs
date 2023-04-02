use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct UserRespData {
    pub id: Uuid,
    pub username: String,
    pub default_asset: i32,
}

pub type AddUserReqData = business::dtos::user_dto::AddUserDto;
