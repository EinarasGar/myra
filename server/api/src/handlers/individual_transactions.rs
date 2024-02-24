use axum::{extract::Path, Json};
use uuid::Uuid;

use crate::{
    auth::AuthenticatedUserState,
    errors::ApiError,
    view_models::transactions::{
        add_individual_transaction::{
            AddIndividualTransactionRequestViewModel, AddIndividualTransactionResponseViewModel,
        },
        get_individual_transactions::GetIndividualTransactionsViewModel,
        update_individual_transaction::{
            UpdateIndividualTransactionRequestViewModel,
            UpdateIndividualTransactionResponseViewModel,
        },
    },
};

/// Add new
///
/// Adds a new individual transaction.
#[utoipa::path(
    post,
    path = "/api/users/:user_id/transactions/individual",
    tag = "Individual Transactions",
    request_body (
      content = AddIndividualTransactionRequestViewModel,
    ),
    responses(
        (status = 200, description = "Individual transaction added successfully.", body = AddIndividualTransactionResponseViewModel)
    ),
    params(
        ("user_id" = Uuid, Path, description = "User Id for which to add the individual transaction for."),
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn add(
    Path(_user_id): Path<Uuid>,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    Json(_params): Json<AddIndividualTransactionRequestViewModel>,
) -> Result<Json<AddIndividualTransactionResponseViewModel>, ApiError> {
    unimplemented!();
}

/// Update existing
///
/// Performs an update of an individual transaction.
/// If the transaction provided is not individual, it will be moved to individual and removed from other group.
#[utoipa::path(
    put,
    path = "/api/users/:user_id/transactions/individual/:transaction_id",
    tag = "Individual Transactions",
    operation_id = "Update an existing individual transaction.",
    request_body (
      content = UpdateIndividualTransactionRequestViewModel,
    ),
    responses(
        (status = 200, description = "Individual transaction updated successfully.", body = UpdateIndividualTransactionResponseViewModel)
    ),
    params(
        ("user_id" = Uuid, Path, description = "User id for which the individual transaction belongs to."),
        ("transaction_id" = Uuid, Path, description = "The id of the specific individual transaction which is being updated."),
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn update(
    Path((_user_id, _transaction_id)): Path<(Uuid, Uuid)>,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    Json(_params): Json<UpdateIndividualTransactionRequestViewModel>,
) -> Result<Json<UpdateIndividualTransactionResponseViewModel>, ApiError> {
    unimplemented!();
}

/// Get all
///
/// Retrieves a list of all individual transactions
#[utoipa::path(
    get,
    path = "/api/users/:user_id/transactions/individual",
    tag = "Individual Transactions",
    responses(
        (status = 200, body = GetIndividualTransactionsViewModel)
    ),
    params(
        ("user_id" = Uuid, Path, description = "User id for which the transactions group belongs to.")
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn get(
    Path(_user_id): Path<Uuid>,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<GetIndividualTransactionsViewModel>, ApiError> {
    unimplemented!();
}
