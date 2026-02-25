use std::collections::HashMap;

use axum::{extract::Path, Json};
use business::dtos::accounts::account_amendment_dto::AccountAmendmentDto;
use itertools::Itertools;
use uuid::Uuid;

use crate::{
    auth::AuthenticatedUserState,
    errors::ApiError,
    states::AccountsServiceState,
    view_models::accounts::{
        add_account::{AddAccountRequestViewModel, AddAccountResponseViewModel},
        base_models::{
            account::IdentifiableAccount, account_id::RequiredAccountId,
            account_liquidity_type::IdentifiableAccountLiquidityTypeViewModel,
            account_type::IdentifiableAccountTypeViewModel, account_type_id::AccountTypeId,
            liquidity_type_id::RequiredLiquidityTypeId,
            metadata_lookup::AccountMetadataLookupTables,
        },
        get_account::GetAccountResponseViewModel,
        get_account_liquidity_types::GetAccountLiquidityTypesResponseViewModel,
        get_account_types::GetAccountTypesResponseViewModel,
        get_accounts::GetAccountsResponseViewModel,
        update_account::UpdateAccountViewModel,
    },
    view_models::errors::{CreateResponses, DeleteResponses, GetResponses, UpdateResponses},
};

/// Get Account
///
/// Gets a specific account of the user with metadata.
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/accounts/{account_id}",
    tag = "Accounts",
    responses(
        (status = 200, description = "Account retrieved successfully.", body = GetAccountResponseViewModel),
        GetResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique Identifier of the user."),
        ("account_id" = Uuid, Path, description = "Id of the account to retrieve.")
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn get_account(
    Path((_user_id, account_id)): Path<(Uuid, Uuid)>,
    AccountsServiceState(account_service): AccountsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<GetAccountResponseViewModel>, ApiError> {
    let account = account_service
        .get_account_with_metadata(account_id)
        .await?;

    let ret = GetAccountResponseViewModel {
        liquidity_type: account.liquidity_type.clone().into(),
        ownership_share: account.ownership_share,
        account: account.into(),
    };

    Ok(ret.into())
}

/// Get Accounts
///
/// Gets all accounts and its metadata associated with user
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/accounts",
    tag = "Accounts",
    responses(
        (status = 200, description = "Accounts retrieved successfully.", body = GetAccountsResponseViewModel),
        GetResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique Identifier of the user."),
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn get_accounts(
    Path(_user_id): Path<Uuid>,
    AccountsServiceState(account_service): AccountsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<GetAccountsResponseViewModel>, ApiError> {
    let account = account_service
        .get_user_accounts_with_metadata(_user_id)
        .await?;

    let mut account_types_hashmap: HashMap<i32, IdentifiableAccountTypeViewModel> = HashMap::new();
    let mut account_liquidity_types_hashmap: HashMap<
        i32,
        IdentifiableAccountLiquidityTypeViewModel,
    > = HashMap::new();

    account.iter().for_each(|x| {
        account_types_hashmap
            .entry(x.account_type.id)
            .or_insert_with(|| IdentifiableAccountTypeViewModel {
                name: x.account_type.name.clone(),
                id: AccountTypeId(x.account_type.id),
            });

        account_liquidity_types_hashmap
            .entry(x.liquidity_type.id)
            .or_insert_with(|| IdentifiableAccountLiquidityTypeViewModel {
                name: x.liquidity_type.name.clone(),
                id: RequiredLiquidityTypeId(x.liquidity_type.id),
            });
    });

    let ret = GetAccountsResponseViewModel {
        accounts: account.into_iter().map(|x| x.into()).collect(),
        lookup_tables: AccountMetadataLookupTables {
            account_types: account_types_hashmap.values().cloned().collect(),
            account_liquidity_types: account_liquidity_types_hashmap.values().cloned().collect(),
        },
    };

    Ok(ret.into())
}

/// Update Account
///
/// Updates a specific account of the user with metadata.
#[utoipa::path(
    put,
    path = "/api/users/{user_id}/accounts/{account_id}",
    tag = "Accounts",
    responses(
        (status = 200, description = "Account updated successfully.", body = UpdateAccountViewModel),
        UpdateResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique Identifier of the user."),
        ("account_id" = Uuid, Path, description = "Id of the account to update."),
    ),
    request_body (
        content = UpdateAccountViewModel,
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn update_account(
    Path((user_id, account_id)): Path<(Uuid, Uuid)>,
    AccountsServiceState(account_service): AccountsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    Json(body): Json<UpdateAccountViewModel>,
) -> Result<Json<UpdateAccountViewModel>, ApiError> {
    let dto = AccountAmendmentDto {
        account_name: body.account.name.clone(),
        account_type: body.account.account_type.0,
        account_liquidity_type: body.liquidity_type.0,
        ownership_share: body.ownership_share,
    };

    account_service
        .update_user_account(user_id, account_id, dto)
        .await?;

    Ok(body.into())
}

/// Add Account
///
/// Adds a new account to the user.
#[utoipa::path(
    post,
    path = "/api/users/{user_id}/accounts",
    tag = "Accounts",
    responses(
        (status = 201, description = "Account created successfully.", body = AddAccountResponseViewModel),
        CreateResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique Identifier of the user."),
    ),
    request_body (
        content = AddAccountRequestViewModel,
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn add_account(
    Path(user_id): Path<Uuid>,
    AccountsServiceState(account_service): AccountsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    Json(body): Json<AddAccountRequestViewModel>,
) -> Result<Json<AddAccountResponseViewModel>, ApiError> {
    let dto = AccountAmendmentDto {
        account_name: body.account.name.clone(),
        account_type: body.account.account_type.0,
        account_liquidity_type: body.liquidity_type.0,
        ownership_share: body.ownership_share,
    };

    let new_id = account_service.add_user_account(user_id, dto).await?;

    let ret = AddAccountResponseViewModel {
        ownership_share: body.ownership_share,
        liquidity_type: body.liquidity_type,
        account: IdentifiableAccount {
            account_id: RequiredAccountId(new_id),
            account: body.account,
        },
    };

    Ok(ret.into())
}

/// Delete Account
///
/// Marks account as inactive so that its unavailable anymore.
#[utoipa::path(
    delete,
    path = "/api/users/{user_id}/accounts/{account_id}",
    tag = "Accounts",
    responses(
        (status = 200, description = "Account marked as deactivated."),
        DeleteResponses
    ),
    params(
        ("user_id" = Uuid, Path, description = "Unique Identifier of the user."),
        ("account_id" = Uuid, Path, description = "Id of the account to delete."),
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn delete_account(
    Path((user_id, account_id)): Path<(Uuid, Uuid)>,
    AccountsServiceState(account_service): AccountsServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<(), ApiError> {
    account_service
        .deactivate_user_account(user_id, account_id)
        .await?;
    Ok(())
}

/// Get Account Types
///
/// Retrieves all available account types
#[utoipa::path(
    get,
    path = "/api/accounts/types",
    tag = "Accounts",
    responses(
        (status = 200, description = "List of available account types.", body = GetAccountTypesResponseViewModel),
        GetResponses
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn get_account_types(
    AccountsServiceState(account_service): AccountsServiceState,
) -> Result<Json<GetAccountTypesResponseViewModel>, ApiError> {
    let dtos = account_service.get_account_types().await?;
    let ret = GetAccountTypesResponseViewModel {
        account_types: dtos.into_iter().map_into().collect(),
    };
    Ok(ret.into())
}

/// Get Account Liquidity Types
///
/// Retrieves all available account liquidity types
#[utoipa::path(
    get,
    path = "/api/accounts/liquidity-types",
    tag = "Accounts",
    responses(
        (status = 200, description = "List of available account liquidity types.", body = GetAccountLiquidityTypesResponseViewModel),
        GetResponses
    ),
    security(
        ("auth_token" = [])
    )

)]
#[tracing::instrument(skip_all, err)]
pub async fn get_account_liquidity_types(
    AccountsServiceState(account_service): AccountsServiceState,
) -> Result<Json<GetAccountLiquidityTypesResponseViewModel>, ApiError> {
    let dtos = account_service.get_account_liquidity_types().await?;
    let ret = GetAccountLiquidityTypesResponseViewModel {
        account_liquidity_types: dtos.into_iter().map_into().collect(),
    };
    Ok(ret.into())
}
