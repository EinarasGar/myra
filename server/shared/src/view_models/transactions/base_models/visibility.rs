#[cfg(feature = "backend")]
use business::dtos::transaction_dto::TransactionVisibilityDto;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum TransactionVisibility {
    #[default]
    Default,
    Ghost,
    Hidden,
}

#[cfg(feature = "backend")]
impl From<TransactionVisibilityDto> for TransactionVisibility {
    fn from(value: TransactionVisibilityDto) -> Self {
        match value {
            TransactionVisibilityDto::Default => Self::Default,
            TransactionVisibilityDto::Ghost => Self::Ghost,
            TransactionVisibilityDto::Hidden => Self::Hidden,
        }
    }
}

#[cfg(feature = "backend")]
impl TransactionVisibility {
    pub fn to_business(self) -> TransactionVisibilityDto {
        match self {
            Self::Default => TransactionVisibilityDto::Default,
            Self::Ghost => TransactionVisibilityDto::Ghost,
            Self::Hidden => TransactionVisibilityDto::Hidden,
        }
    }
}
