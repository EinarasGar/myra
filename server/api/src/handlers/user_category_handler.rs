use std::collections::HashMap;

use axum::{extract::Path, http::StatusCode, Json};
use uuid::Uuid;
use validator::Validate;

use crate::{
    auth::AuthenticatedUserState,
    errors::ApiError,
    states::{CategoryServiceState, CategoryTypeServiceState},
    view_models::{
        base_models::search::SearchCategoriesResponseViewModel,
        categories::{
            base_models::{
                category::IdentifiableCategoryViewModel,
                category_type::{CategoryTypeViewModel, IdentifiableCategoryTypeViewModel},
                category_type_id::RequiredCategoryTypeId,
                metadata_lookup::CategoryMetadataLookupTables,
            },
            create_category::{CreateCategoryRequestViewModel, CreateCategoryResponseViewModel},
            create_category_type::{
                CreateCategoryTypeRequestViewModel, CreateCategoryTypeResponseViewModel,
            },
            get_categories::GetCategoriesResponseViewModel,
            get_category::GetCategoryResponseViewModel,
            get_category_types::GetCategoryTypesResponseViewModel,
            update_category::{UpdateCategoryRequestViewModel, UpdateCategoryResponseViewModel},
            update_category_type::{
                UpdateCategoryTypeRequestViewModel, UpdateCategoryTypeResponseViewModel,
            },
        },
        errors::{CreateResponses, DeleteResponses, GetResponses, UpdateResponses},
    },
};

use itertools::Itertools;

/// Get Categories
///
/// Retrieves full list of custom user categories.
/// Does not include global categories.
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/categories",
    tag = "User Categories",
    params(
        ("user_id" = Uuid, Path, description = "User ID"),
    ),
    responses(
        (status = 200, description = "Categories retrieved successfully", body = GetCategoriesResponseViewModel),
        GetResponses
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn get_categories(
    Path(user_id): Path<Uuid>,
    CategoryServiceState(category_service): CategoryServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<GetCategoriesResponseViewModel>, ApiError> {
    let result = category_service.get_all_user_categories(user_id).await?;

    let mut category_types_map: HashMap<i32, IdentifiableCategoryTypeViewModel> = HashMap::new();
    for category in &result {
        category_types_map
            .entry(category.category_type)
            .or_insert_with(|| IdentifiableCategoryTypeViewModel {
                id: RequiredCategoryTypeId(category.category_type),
                category_type: CategoryTypeViewModel {
                    name: category.category_type_name.clone(),
                    is_global: category.category_type_is_global,
                },
            });
    }

    let categories: Vec<IdentifiableCategoryViewModel> = result.into_iter().map_into().collect();
    let response = GetCategoriesResponseViewModel {
        categories,
        lookup_tables: CategoryMetadataLookupTables {
            category_types: category_types_map.into_values().collect(),
        },
    };
    Ok(Json(response))
}

/// Get Category
///
/// Retrieves details of a specific category.
/// User can only access global categories or their own categories.
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/categories/{category_id}",
    tag = "User Categories",
    params(
        ("user_id" = Uuid, Path, description = "User ID"),
        ("category_id" = i32, Path, description = "Category ID")
    ),
    responses(
        (status = 200, description = "Category retrieved successfully", body = GetCategoryResponseViewModel),
        GetResponses
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn get_user_category(
    Path((user_id, category_id)): Path<(Uuid, i32)>,
    CategoryServiceState(category_service): CategoryServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<GetCategoryResponseViewModel>, ApiError> {
    let category = category_service.get_category(category_id, user_id).await?;

    Ok(Json(GetCategoryResponseViewModel {
        category: category.into(),
    }))
}

/// Create Category
///
/// Creates a new user-specific category.
/// Category name must be unique (case-insensitive) across global and user categories.
/// Users are limited to 100 custom categories.
#[utoipa::path(
    post,
    path = "/api/users/{user_id}/categories",
    tag = "User Categories",
    params(
        ("user_id" = Uuid, Path, description = "User ID")
    ),
    request_body = CreateCategoryRequestViewModel,
    responses(
        (status = 201, description = "Category created successfully", body = CreateCategoryResponseViewModel),
        CreateResponses
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn post_user_category(
    Path(user_id): Path<Uuid>,
    CategoryServiceState(category_service): CategoryServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    Json(request): Json<CreateCategoryRequestViewModel>,
) -> Result<(StatusCode, Json<CreateCategoryResponseViewModel>), ApiError> {
    request.validate()?;

    let category = category_service
        .create_category(user_id, request.into())
        .await?;

    Ok((
        StatusCode::CREATED,
        Json(CreateCategoryResponseViewModel {
            category: category.into(),
        }),
    ))
}

/// Update Category
///
/// Updates an existing user-specific category.
/// Cannot update global or system categories.
/// Category name must remain unique if changed.
#[utoipa::path(
    put,
    path = "/api/users/{user_id}/categories/{category_id}",
    tag = "User Categories",
    params(
        ("user_id" = Uuid, Path, description = "User ID"),
        ("category_id" = i32, Path, description = "Category ID")
    ),
    request_body = UpdateCategoryRequestViewModel,
    responses(
        (status = 200, description = "Category updated successfully", body = UpdateCategoryResponseViewModel),
        UpdateResponses
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn put_user_category(
    Path((user_id, category_id)): Path<(Uuid, i32)>,
    CategoryServiceState(category_service): CategoryServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    Json(request): Json<UpdateCategoryRequestViewModel>,
) -> Result<Json<UpdateCategoryResponseViewModel>, ApiError> {
    request.validate()?;

    let category = category_service
        .update_category(category_id, user_id, request.into())
        .await?;

    Ok(Json(UpdateCategoryResponseViewModel {
        category: category.into(),
    }))
}

/// Delete Category
///
/// Deletes a user-specific category.
/// Cannot delete global, system categories, or categories with transaction dependencies.
#[utoipa::path(
    delete,
    path = "/api/users/{user_id}/categories/{category_id}",
    tag = "User Categories",
    params(
        ("user_id" = Uuid, Path, description = "User ID"),
        ("category_id" = i32, Path, description = "Category ID")
    ),
    responses(
        (status = 204, description = "Category deleted successfully"),
        DeleteResponses
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn delete_user_category(
    Path((user_id, category_id)): Path<(Uuid, i32)>,
    CategoryServiceState(category_service): CategoryServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<StatusCode, ApiError> {
    category_service
        .delete_category(category_id, user_id)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}

/// Get Category Types
///
/// Retrieves all category types accessible to the user.
/// Includes both global types and user-specific types.
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/categories/types",
    tag = "User Categories",
    params(
        ("user_id" = Uuid, Path, description = "User ID")
    ),
    responses(
        (status = 200, description = "Category types retrieved successfully", body = GetCategoryTypesResponseViewModel),
        GetResponses
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn get_user_category_types(
    Path(user_id): Path<Uuid>,
    CategoryTypeServiceState(category_type_service): CategoryTypeServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<GetCategoryTypesResponseViewModel>, ApiError> {
    let types = category_type_service
        .get_user_category_types(user_id)
        .await?;

    let response = GetCategoryTypesResponseViewModel {
        category_types: types.map_into().collect(),
    };

    Ok(Json(response))
}

/// Create Category Type
///
/// Creates a new user-specific category type.
/// Type name must be unique across global and user types.
/// Users are limited to 20 custom types.
#[utoipa::path(
    post,
    path = "/api/users/{user_id}/categories/types",
    tag = "User Categories",
    params(
        ("user_id" = Uuid, Path, description = "User ID")
    ),
    request_body = CreateCategoryTypeRequestViewModel,
    responses(
        (status = 201, description = "Category type created successfully", body = CreateCategoryTypeResponseViewModel),
        CreateResponses
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn post_user_category_type(
    Path(user_id): Path<Uuid>,
    CategoryTypeServiceState(category_type_service): CategoryTypeServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    Json(request): Json<CreateCategoryTypeRequestViewModel>,
) -> Result<(StatusCode, Json<CreateCategoryTypeResponseViewModel>), ApiError> {
    request.validate()?;

    let category_type = category_type_service
        .create_category_type(user_id, request.into())
        .await?;

    Ok((
        StatusCode::CREATED,
        Json(CreateCategoryTypeResponseViewModel {
            category_type: category_type.into(),
        }),
    ))
}

/// Update Category Type
///
/// Updates an existing user-specific category type.
/// Cannot update global types.
#[utoipa::path(
    put,
    path = "/api/users/{user_id}/categories/types/{type_id}",
    tag = "User Categories",
    params(
        ("user_id" = Uuid, Path, description = "User ID"),
        ("type_id" = i32, Path, description = "Category type ID")
    ),
    request_body = UpdateCategoryTypeRequestViewModel,
    responses(
        (status = 200, description = "Category type updated successfully", body = UpdateCategoryTypeResponseViewModel),
        UpdateResponses
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn put_user_category_type(
    Path((user_id, type_id)): Path<(Uuid, i32)>,
    CategoryTypeServiceState(category_type_service): CategoryTypeServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
    Json(request): Json<UpdateCategoryTypeRequestViewModel>,
) -> Result<Json<UpdateCategoryTypeResponseViewModel>, ApiError> {
    request.validate()?;

    let category_type = category_type_service
        .update_category_type(type_id, user_id, request.into())
        .await?;

    Ok(Json(UpdateCategoryTypeResponseViewModel {
        category_type: category_type.into(),
    }))
}

/// Delete Category Type
///
/// Deletes a user-specific category type.
/// Cannot delete global types or types with category dependencies.
#[utoipa::path(
    delete,
    path = "/api/users/{user_id}/categories/types/{type_id}",
    tag = "User Categories",
    params(
        ("user_id" = Uuid, Path, description = "User ID"),
        ("type_id" = i32, Path, description = "Category type ID")
    ),
    responses(
        (status = 204, description = "Category type deleted successfully"),
        DeleteResponses
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn delete_user_category_type(
    Path((user_id, type_id)): Path<(Uuid, i32)>,
    CategoryTypeServiceState(category_type_service): CategoryTypeServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<StatusCode, ApiError> {
    category_type_service
        .delete_category_type(type_id, user_id)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}
