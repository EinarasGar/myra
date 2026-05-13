#[cfg(feature = "backend")]
use business::dtos::ai_quick_upload_dto::QuickUploadDto;
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::view_models::{
    accounts::base_models::account::IdentifiableAccountViewModel,
    assets::base_models::asset::IdentifiableAssetViewModel,
    categories::base_models::category::IdentifiableCategoryViewModel,
};

#[derive(Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct CreateQuickUploadRequestViewModel {
    pub file_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, utoipa::ToSchema)]
pub struct QuickUploadLookupTables {
    pub accounts: Vec<IdentifiableAccountViewModel>,
    pub assets: Vec<IdentifiableAssetViewModel>,
    pub categories: Vec<IdentifiableCategoryViewModel>,
}

#[derive(Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct QuickUploadResponseViewModel {
    pub status: String,
    pub source_file_id: Uuid,
    pub proposal_type: Option<String>,
    pub proposal_data: Option<serde_json::Value>,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    pub updated_at: OffsetDateTime,
    pub lookup_tables: QuickUploadLookupTables,
}

#[derive(Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct IdentifiableQuickUploadResponseViewModel {
    pub id: Uuid,
    pub status: String,
    pub source_file_id: Uuid,
    pub proposal_type: Option<String>,
    pub proposal_data: Option<serde_json::Value>,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    pub updated_at: OffsetDateTime,
}

#[derive(Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct QuickUploadMessageRequestViewModel {
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct QuickUploadMessageResponseViewModel {
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct CompleteQuickUploadRequestViewModel {
    pub accepted: bool,
}

#[cfg(feature = "backend")]
impl From<QuickUploadDto> for QuickUploadResponseViewModel {
    fn from(dto: QuickUploadDto) -> Self {
        Self {
            status: dto.status.to_string(),
            source_file_id: dto.source_file_id,
            proposal_type: dto.proposal_type.map(|t| t.to_string()),
            proposal_data: dto.proposal_data,
            created_at: dto.created_at,
            updated_at: dto.updated_at,
            lookup_tables: QuickUploadLookupTables::default(),
        }
    }
}

#[cfg(feature = "backend")]
impl From<QuickUploadDto> for IdentifiableQuickUploadResponseViewModel {
    fn from(dto: QuickUploadDto) -> Self {
        Self {
            id: dto.id,
            status: dto.status.to_string(),
            source_file_id: dto.source_file_id,
            proposal_type: dto.proposal_type.map(|t| t.to_string()),
            proposal_data: dto.proposal_data,
            created_at: dto.created_at,
            updated_at: dto.updated_at,
        }
    }
}
