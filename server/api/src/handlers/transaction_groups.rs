use axum::{extract::Path, Json};
use uuid::Uuid;

use crate::{
    auth::AuthenticatedUserState,
    errors::ApiError,
    view_models::transactions::{
        add_transaction_group::{
            AddTransactionGroupRequestViewModel, AddTransactionGroupResponseViewModel,
        },
        get_transaction_groups::GetTransactionGroupsViewModel,
        update_transaction_group::{
            UpdateTransactionGroupRequestViewModel, UpdateTransactionGroupResponseViewModel,
        },
    },
};

/// Add new
///
/// Adds a group of transactions with metadata related to all of them.
#[utoipa::path(
    post,
    path = "/api/users/:user_id/transactions/groups",
    tag = "Transaction Groups",
    request_body (
      content = AddTransactionGroupRequestViewModel,
    ),
    responses(
        (status = 200, description = "Transaction group added successfully.", body = AddTransactionGroupResponseViewModel)
    ),
    params(
        ("user_id" = Uuid, Path, description = "User Id for which to add the transaction group for."),
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn add(
    Path(_user_id): Path<Uuid>,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    Json(_params): Json<AddTransactionGroupRequestViewModel>,
) -> Result<Json<AddTransactionGroupResponseViewModel>, ApiError> {
    unimplemented!();
}

/// Update existing
///
/// If the transactions array is updated with an existing transaction id, that transaction will
/// be moved from individual to a group.
#[utoipa::path(
    put,
    path = "/api/users/:user_id/transactions/groups/:group_id",
    tag = "Transaction Groups",
    request_body (
      content = UpdateTransactionGroupRequestViewModel,
    ),
    responses(
        (status = 200, description = "Transaction group updated successfully.", body = UpdateTransactionGroupResponseViewModel)
    ),
    params(
        ("user_id" = Uuid, Path, description = "User id for which the transaction group belongs to."),
        ("group_id" = i32, Path, description = "The id of the transaction group which is being updated."),
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn update(
    Path((_user_id, _group_id)): Path<(Uuid, i32)>,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    Json(_params): Json<UpdateTransactionGroupRequestViewModel>,
) -> Result<Json<UpdateTransactionGroupResponseViewModel>, ApiError> {
    unimplemented!();
}

/// Delete existing
///
/// Deletes the entire transaction group and associated transactions within it.
#[utoipa::path(
    delete,
    path = "/api/users/:user_id/transactions/groups/:group_id",
    tag = "Transaction Groups",
    operation_id = "Delete an existing transaction group.",
    params(
        ("user_id" = Uuid, Path, description = "User id for which the transaction group belongs to."),
        ("group_id" = i32, Path, description = "The Id of the transaction group to be deleted."),
    ),
    responses(
        (status = 200, description = "Transaction deleted successfully."),
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn delete(
    Path((_user_id, _group_id)): Path<(Uuid, i32)>,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<(), ApiError> {
    unimplemented!();
}

/// Get all
///
/// Retrieves a list of all individual transactions
#[utoipa::path(
    get,
    path = "/api/users/:user_id/transactions/groups",
    tag = "Transaction Groups",
    responses(
        (status = 200, body = GetTransactionGroupsViewModel)
    ),
    params(
        ("user_id" = Uuid, Path, description = "User id for which the transaction group belongs to.")
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn get(
    Path(_user_id): Path<Uuid>,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<GetTransactionGroupsViewModel>, ApiError> {
    unimplemented!();
}
