#[cfg(feature = "backend")]
use business::dtos::connectors::{BindingUpdateStatusDto, BindingWriteModeDto};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum BindingWriteMode {
    Ghost,
    Trusted,
}

#[cfg(feature = "backend")]
impl BindingWriteMode {
    pub fn to_business(self) -> BindingWriteModeDto {
        match self {
            Self::Ghost => BindingWriteModeDto::Ghost,
            Self::Trusted => BindingWriteModeDto::Trusted,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum BindingUpdateStatus {
    Active,
    Paused,
}

#[cfg(feature = "backend")]
impl BindingUpdateStatus {
    pub fn to_business(self) -> BindingUpdateStatusDto {
        match self {
            Self::Active => BindingUpdateStatusDto::Active,
            Self::Paused => BindingUpdateStatusDto::Paused,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateBindingRequestViewModel {
    pub write_mode: BindingWriteMode,
    pub status: BindingUpdateStatus,
}
