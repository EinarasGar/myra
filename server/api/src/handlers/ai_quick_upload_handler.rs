use std::convert::Infallible;

use axum::{
    extract::Path,
    http::StatusCode,
    response::sse::{Event, KeepAlive, Sse},
    Json,
};
use futures::Stream;
use itertools::Itertools;
use serde::Deserialize;
use uuid::Uuid;

use business::dtos::ai_quick_upload_dto::QuickUploadNotification;
use dal::query_params::ai_conversation_params::QuickUploadStatus;

use crate::{
    auth::AuthenticatedUserId,
    converters::extract_ids_from_proposal,
    errors::ApiError,
    extractors::ValidatedJson,
    states::{
        AccountsServiceState, AiQuickUploadServiceState, AssetsServiceState, CategoryServiceState,
    },
    view_models::ai::quick_upload::{
        CompleteQuickUploadRequestViewModel, CreateQuickUploadRequestViewModel,
        IdentifiableQuickUploadResponseViewModel, QuickUploadLookupTables,
        QuickUploadMessageRequestViewModel, QuickUploadMessageResponseViewModel,
        QuickUploadResponseViewModel,
    },
};

#[derive(Deserialize)]
pub(crate) struct QuickUploadIdPath {
    quick_upload_id: Uuid,
}

#[utoipa::path(
    post,
    path = "/api/users/{user_id}/ai/quick-upload",
    tag = "AI Quick Upload",
    request_body(content = CreateQuickUploadRequestViewModel),
    responses(
        (status = 201, description = "Quick upload created.", body = IdentifiableQuickUploadResponseViewModel),
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique identifier of the user."),
    ),
    security(("auth_token" = []))
)]
pub async fn create_quick_upload(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    AiQuickUploadServiceState(service): AiQuickUploadServiceState,
    ValidatedJson(body): ValidatedJson<CreateQuickUploadRequestViewModel>,
) -> Result<(StatusCode, Json<IdentifiableQuickUploadResponseViewModel>), ApiError> {
    let dto = service
        .create_quick_upload(user_id, body.file_id)
        .await
        .map_err(ApiError::from_anyhow)?;
    Ok((StatusCode::CREATED, Json(dto.into())))
}

#[utoipa::path(
    get,
    path = "/api/users/{user_id}/ai/quick-upload",
    tag = "AI Quick Upload",
    responses(
        (status = 200, description = "List of quick uploads.", body = Vec<IdentifiableQuickUploadResponseViewModel>),
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique identifier of the user."),
    ),
    security(("auth_token" = []))
)]
pub async fn list_quick_uploads(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    AiQuickUploadServiceState(service): AiQuickUploadServiceState,
) -> Result<Json<Vec<IdentifiableQuickUploadResponseViewModel>>, ApiError> {
    let dtos = service
        .get_quick_uploads(user_id, true)
        .await
        .map_err(ApiError::from_anyhow)?;
    Ok(Json(dtos.into_iter().map_into().collect()))
}

#[utoipa::path(
    get,
    path = "/api/users/{user_id}/ai/quick-upload/{quick_upload_id}",
    tag = "AI Quick Upload",
    responses(
        (status = 200, description = "Quick upload details.", body = QuickUploadResponseViewModel),
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique identifier of the user."),
        ("quick_upload_id" = Uuid, Path, description = "Unique identifier of the quick upload."),
    ),
    security(("auth_token" = []))
)]
pub async fn get_quick_upload(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    Path(QuickUploadIdPath { quick_upload_id }): Path<QuickUploadIdPath>,
    AiQuickUploadServiceState(service): AiQuickUploadServiceState,
    AssetsServiceState(asset_service): AssetsServiceState,
    AccountsServiceState(accounts_service): AccountsServiceState,
    CategoryServiceState(category_service): CategoryServiceState,
) -> Result<Json<QuickUploadResponseViewModel>, ApiError> {
    let dto = service
        .get_quick_upload(quick_upload_id, user_id)
        .await
        .map_err(ApiError::from_anyhow)?;

    let (account_ids, asset_ids, category_ids) =
        extract_ids_from_proposal(dto.proposal_type.as_ref(), dto.proposal_data.as_ref());

    let (assets, accounts, categories) = tokio::try_join!(
        asset_service.get_assets(asset_ids),
        accounts_service.get_accounts(account_ids),
        category_service.get_categories(category_ids),
    )?;

    let mut vm: QuickUploadResponseViewModel = dto.into();
    vm.lookup_tables = QuickUploadLookupTables {
        assets: assets.into_iter().map_into().collect(),
        accounts: accounts.into_iter().map_into().collect(),
        categories: categories.into_iter().map_into().collect(),
    };

    Ok(Json(vm))
}

pub async fn subscribe(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    Path(QuickUploadIdPath { quick_upload_id }): Path<QuickUploadIdPath>,
    AiQuickUploadServiceState(service): AiQuickUploadServiceState,
) -> Result<Sse<impl Stream<Item = Result<Event, Infallible>>>, ApiError> {
    let dto = service
        .get_quick_upload(quick_upload_id, user_id)
        .await
        .map_err(ApiError::from_anyhow)?;

    let is_terminal = dto.status.is_terminal();
    let vm: QuickUploadResponseViewModel = dto.into();
    let current_data = serde_json::to_string(&vm).unwrap_or_default();

    let mut rx = service.subscribe(quick_upload_id).await;

    let stream = async_stream::stream! {
        yield Ok(Event::default().event("state").data(current_data));
        if is_terminal {
            yield Ok(Event::default().event("done").data(""));
            return;
        }

        loop {
            match rx.recv().await {
                Ok(event) => {
                    if let Ok(notification) = serde_json::from_value::<QuickUploadNotification>(event.payload) {
                        let is_terminal = matches!(notification, QuickUploadNotification::Done | QuickUploadNotification::Error { .. });
                        match notification {
                            QuickUploadNotification::Status { step } => {
                                yield Ok(Event::default().event("status").data(
                                    serde_json::json!({"step": step}).to_string()
                                ));
                            }
                            QuickUploadNotification::Proposal { proposal_type, data } => {
                                yield Ok(Event::default().event("proposal").data(
                                    serde_json::json!({"proposal_type": proposal_type, "data": data}).to_string()
                                ));
                            }
                            QuickUploadNotification::Error { message } => {
                                yield Ok(Event::default().event("error").data(
                                    serde_json::json!({"message": message}).to_string()
                                ));
                            }
                            QuickUploadNotification::Done => {
                                yield Ok(Event::default().event("done").data(""));
                            }
                        }
                        if is_terminal { break; }
                    }
                }
                Err(_) => break,
            }
        }
    };

    Ok(Sse::new(stream).keep_alive(KeepAlive::default()))
}

#[utoipa::path(
    post,
    path = "/api/users/{user_id}/ai/quick-upload/{quick_upload_id}/message",
    tag = "AI Quick Upload",
    request_body(content = QuickUploadMessageRequestViewModel),
    responses(
        (status = 202, description = "Correction enqueued.", body = QuickUploadMessageResponseViewModel),
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique identifier of the user."),
        ("quick_upload_id" = Uuid, Path, description = "Unique identifier of the quick upload."),
    ),
    security(("auth_token" = []))
)]
pub async fn send_correction(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    Path(QuickUploadIdPath { quick_upload_id }): Path<QuickUploadIdPath>,
    AiQuickUploadServiceState(service): AiQuickUploadServiceState,
    ValidatedJson(body): ValidatedJson<QuickUploadMessageRequestViewModel>,
) -> Result<(StatusCode, Json<QuickUploadMessageResponseViewModel>), ApiError> {
    service
        .enqueue_correction(quick_upload_id, user_id, body.message)
        .await
        .map_err(ApiError::from_anyhow)?;

    Ok((
        StatusCode::ACCEPTED,
        Json(QuickUploadMessageResponseViewModel {
            status: QuickUploadStatus::Processing.to_string(),
        }),
    ))
}

#[utoipa::path(
    post,
    path = "/api/users/{user_id}/ai/quick-upload/{quick_upload_id}/complete",
    tag = "AI Quick Upload",
    responses(
        (status = 204, description = "Quick upload completed."),
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique identifier of the user."),
        ("quick_upload_id" = Uuid, Path, description = "Unique identifier of the quick upload."),
    ),
    request_body(content = CompleteQuickUploadRequestViewModel),
    security(("auth_token" = []))
)]
pub async fn complete(
    AuthenticatedUserId(user_id): AuthenticatedUserId,
    Path(QuickUploadIdPath { quick_upload_id }): Path<QuickUploadIdPath>,
    AiQuickUploadServiceState(service): AiQuickUploadServiceState,
    ValidatedJson(body): ValidatedJson<CompleteQuickUploadRequestViewModel>,
) -> Result<StatusCode, ApiError> {
    service
        .complete(quick_upload_id, user_id, body.accepted)
        .await
        .map_err(ApiError::from_anyhow)?;
    Ok(StatusCode::NO_CONTENT)
}
