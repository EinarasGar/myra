use axum::{extract::Path, http::StatusCode, Json};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Deserialize)]
pub(crate) struct FileIdPath {
    file_id: Uuid,
}

use crate::{
    auth::AuthenticatedUserId,
    errors::ApiError,
    extractors::ValidatedJson,
    states::FileServiceState,
    view_models::{
        errors::{CreateResponses, DeleteResponses, GetResponses},
        files::{
            confirm_file::ConfirmFileResponseViewModel,
            create_file::{CreateFileRequestViewModel, CreateFileResponseViewModel},
            file_url::FileUrlResponseViewModel,
            get_file::GetFileResponseViewModel,
        },
    },
};
use business::dtos::file_dto::CreateFileDto;

/// Create File
///
/// Creates a new file record and returns a presigned upload URL.
#[utoipa::path(
    post,
    path = "/api/users/{user_id}/files",
    tag = "Files",
    responses(
        (status = 201, description = "File record created with upload URL.", body = CreateFileResponseViewModel),
        CreateResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique identifier of the user."),
    ),
    request_body(content = CreateFileRequestViewModel),
    security(("auth_token" = []))
)]
#[tracing::instrument(skip_all, err)]
pub async fn create_file(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    FileServiceState(service): FileServiceState,
    ValidatedJson(body): ValidatedJson<CreateFileRequestViewModel>,
) -> Result<(StatusCode, Json<CreateFileResponseViewModel>), ApiError> {
    let dto = CreateFileDto {
        original_name: body.original_name.into_inner(),
        mime_type: body.mime_type.into_inner(),
        size_bytes: body.size_bytes.value(),
    };

    let result = service
        .create_file(user_id, dto)
        .await
        .map_err(ApiError::from_anyhow)?;
    let vm: CreateFileResponseViewModel = result.into();
    Ok((StatusCode::CREATED, Json(vm)))
}

/// Get File
///
/// Retrieves a single file record.
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/files/{file_id}",
    tag = "Files",
    responses(
        (status = 200, description = "File retrieved successfully.", body = GetFileResponseViewModel),
        GetResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique identifier of the user."),
        ("file_id" = Uuid, Path, description = "Unique identifier of the file."),
    ),
    security(("auth_token" = []))
)]
#[tracing::instrument(skip_all, err)]
pub async fn get_file(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    Path(FileIdPath { file_id }): Path<FileIdPath>,
    FileServiceState(service): FileServiceState,
) -> Result<Json<GetFileResponseViewModel>, ApiError> {
    let file = service
        .get_file(user_id, file_id)
        .await
        .map_err(ApiError::from_anyhow)?;
    let vm: GetFileResponseViewModel = file.into();
    Ok(Json(vm))
}

/// Delete File
///
/// Deletes a file record and associated storage objects.
#[utoipa::path(
    delete,
    path = "/api/users/{user_id}/files/{file_id}",
    tag = "Files",
    responses(
        (status = 204, description = "File deleted successfully."),
        DeleteResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique identifier of the user."),
        ("file_id" = Uuid, Path, description = "Unique identifier of the file."),
    ),
    security(("auth_token" = []))
)]
#[tracing::instrument(skip_all, err)]
pub async fn delete_file(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    Path(FileIdPath { file_id }): Path<FileIdPath>,
    FileServiceState(service): FileServiceState,
) -> Result<StatusCode, ApiError> {
    service
        .delete_file(user_id, file_id)
        .await
        .map_err(ApiError::from_anyhow)?;
    Ok(StatusCode::NO_CONTENT)
}

/// Confirm File Upload
///
/// Transitions file to processing and triggers background verification.
#[utoipa::path(
    post,
    path = "/api/users/{user_id}/files/{file_id}/confirm",
    tag = "Files",
    responses(
        (status = 200, description = "File confirmed and processing started.", body = ConfirmFileResponseViewModel),
        (status = 409, description = "File status is not pending.", body = crate::errors::ApiErrorResponse),
        CreateResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique identifier of the user."),
        ("file_id" = Uuid, Path, description = "Unique identifier of the file."),
    ),
    security(("auth_token" = []))
)]
#[tracing::instrument(skip_all, err)]
pub async fn confirm_file(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    Path(FileIdPath { file_id }): Path<FileIdPath>,
    FileServiceState(service): FileServiceState,
) -> Result<Json<ConfirmFileResponseViewModel>, ApiError> {
    let file = service
        .confirm_file(user_id, file_id)
        .await
        .map_err(ApiError::from_anyhow)?;
    let vm: ConfirmFileResponseViewModel = file.into();
    Ok(Json(vm))
}

/// Get File Download URL
///
/// Returns a signed download URL for the file.
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/files/{file_id}/url",
    tag = "Files",
    responses(
        (status = 200, description = "Download URL generated.", body = FileUrlResponseViewModel),
        (status = 409, description = "File is not yet available for download.", body = crate::errors::ApiErrorResponse),
        GetResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique identifier of the user."),
        ("file_id" = Uuid, Path, description = "Unique identifier of the file."),
    ),
    security(("auth_token" = []))
)]
#[tracing::instrument(skip_all, err)]
pub async fn get_file_url(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    Path(FileIdPath { file_id }): Path<FileIdPath>,
    FileServiceState(service): FileServiceState,
) -> Result<Json<FileUrlResponseViewModel>, ApiError> {
    let file_url = service
        .get_download_url(user_id, file_id)
        .await
        .map_err(ApiError::from_anyhow)?;
    Ok(Json(FileUrlResponseViewModel {
        url: file_url.url,
        expires_in_seconds: file_url.expires_in_seconds,
    }))
}

/// Get File Thumbnail URL
///
/// Returns a signed URL for the file thumbnail.
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/files/{file_id}/thumbnail",
    tag = "Files",
    responses(
        (status = 200, description = "Thumbnail URL generated.", body = FileUrlResponseViewModel),
        (status = 404, description = "Thumbnail not available.", body = crate::errors::ApiErrorResponse),
        (status = 409, description = "File is not yet available.", body = crate::errors::ApiErrorResponse),
        GetResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique identifier of the user."),
        ("file_id" = Uuid, Path, description = "Unique identifier of the file."),
    ),
    security(("auth_token" = []))
)]
#[tracing::instrument(skip_all, err)]
pub async fn get_file_thumbnail(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    Path(FileIdPath { file_id }): Path<FileIdPath>,
    FileServiceState(service): FileServiceState,
) -> Result<Json<FileUrlResponseViewModel>, ApiError> {
    let file_url = service
        .get_thumbnail_url(user_id, file_id)
        .await
        .map_err(ApiError::from_anyhow)?;
    Ok(Json(FileUrlResponseViewModel {
        url: file_url.url,
        expires_in_seconds: file_url.expires_in_seconds,
    }))
}
