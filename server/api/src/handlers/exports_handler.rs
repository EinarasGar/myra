use axum::{http::StatusCode, Json};
use itertools::Itertools;

use crate::{
    auth::AuthenticatedUserId,
    errors::ApiError,
    extractors::ValidatedJson,
    states::LedgerExportServiceState,
    view_models::{
        errors::{CreateResponses, GetResponses},
        exports::{
            create_export::{
                CreateExportRequestViewModel, CreateExportResponseViewModel, ExportFormatViewModel,
            },
            get_exports::{GetExportsResponseViewModel, IdentifiableExportViewModel},
        },
    },
};
use business::dtos::exports::export_dto::ExportFormat;

/// Create Export
///
/// Renders the user's entire ledger in the requested format, stores it, and returns the export record.
#[utoipa::path(
    post,
    path = "/api/users/{user_id}/exports",
    tag = "Exports",
    responses(
        (status = 201, description = "Export created.", body = CreateExportResponseViewModel),
        CreateResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique identifier of the user."),
    ),
    request_body(content = CreateExportRequestViewModel),
    security(("auth_token" = []))
)]
#[tracing::instrument(level = "info", skip_all, fields(user_id = %user_id))]
pub async fn create_export(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    LedgerExportServiceState(service): LedgerExportServiceState,
    ValidatedJson(body): ValidatedJson<CreateExportRequestViewModel>,
) -> Result<(StatusCode, Json<CreateExportResponseViewModel>), ApiError> {
    let format = match body.format {
        ExportFormatViewModel::Csv => ExportFormat::Csv,
        ExportFormatViewModel::Beancount => ExportFormat::Beancount,
    };

    let export = service
        .create_export(user_id, format)
        .await
        .map_err(ApiError::from_anyhow)?;

    let vm: CreateExportResponseViewModel = export.into();
    Ok((StatusCode::CREATED, Json(vm)))
}

/// Get Exports
///
/// Lists the user's ledger exports, newest first.
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/exports",
    tag = "Exports",
    responses(
        (status = 200, description = "Exports retrieved successfully.", body = GetExportsResponseViewModel),
        GetResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique identifier of the user."),
    ),
    security(("auth_token" = []))
)]
#[tracing::instrument(level = "info", skip_all, fields(user_id = %user_id))]
pub async fn list_exports(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    LedgerExportServiceState(service): LedgerExportServiceState,
) -> Result<Json<GetExportsResponseViewModel>, ApiError> {
    let exports = service
        .list_exports(user_id)
        .await
        .map_err(ApiError::from_anyhow)?;

    let exports: Vec<IdentifiableExportViewModel> = exports.into_iter().map_into().collect();
    Ok(Json(GetExportsResponseViewModel { exports }))
}
