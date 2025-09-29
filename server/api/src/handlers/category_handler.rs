use axum::{
    extract::{Path, Query},
    http::StatusCode,
    Json,
};
use itertools::Itertools;
use std::collections::HashMap;
use uuid::Uuid;
use validator::Validate;

use crate::{
    auth::AuthenticatedUserState,
    errors::ApiError,
    states::{CategoryServiceState, CategoryTypeServiceState},
    view_models::{
        base_models::search::{PaginatedSearchQuery, SearchCategoriesResponseViewModel},
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
            get_category::GetCategoryResponseViewModel,
            get_category_types::GetCategoryTypesResponseViewModel,
            search_categories::SearchCategoriesQuery,
            update_category::{UpdateCategoryRequestViewModel, UpdateCategoryResponseViewModel},
            update_category_type::{
                UpdateCategoryTypeRequestViewModel, UpdateCategoryTypeResponseViewModel,
            },
        },
        errors::{CreateResponses, DeleteResponses, GetResponses, UpdateResponses},
    },
};

/// Search Categories
///
/// Retrieves a paginated list of categories accessible to the user.
/// Includes both global categories and user-specific categories.
/// Supports searching by category name or type name, and filtering by type ID.
#[utoipa::path(
    get,
    path = "/api/users/{user_id}/categories",
    tag = "Categories",
    params(
        ("user_id" = Uuid, Path, description = "User ID"),
        PaginatedSearchQuery,
        SearchCategoriesQuery
    ),
    responses(
        (status = 200, description = "Categories retrieved successfully", body = SearchCategoriesResponseViewModel),
        GetResponses
    ),
    security(
        ("auth_token" = [])
    )
)]
#[tracing::instrument(skip_all, err)]
pub async fn search_categories(
    Path(user_id): Path<Uuid>,
    Query(search_query): Query<PaginatedSearchQuery>,
    Query(query): Query<SearchCategoriesQuery>,
    CategoryServiceState(category_service): CategoryServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<SearchCategoriesResponseViewModel>, ApiError> {
    let result = category_service
        .get_categories(
            user_id,
            search_query.start,
            search_query.count,
            search_query.query,
            query.type_id,
        )
        .await?;

    let mut category_types_map: HashMap<i32, IdentifiableCategoryTypeViewModel> = HashMap::new();
    for category in &result.results {
        category_types_map
            .entry(category.category_type)
            .or_insert_with(|| IdentifiableCategoryTypeViewModel {
                id: RequiredCategoryTypeId(category.category_type),
                category_type: CategoryTypeViewModel {
                    name: category.category_type_name.clone(),
                    is_global: category.is_global,
                },
            });
    }

    let categories: Vec<IdentifiableCategoryViewModel> =
        result.results.into_iter().map_into().collect();

    let response = SearchCategoriesResponseViewModel {
        results: categories,
        total_results: result.total_results,
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
    tag = "Categories",
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
pub async fn get_category(
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
    tag = "Categories",
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
pub async fn create_category(
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
    tag = "Categories",
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
pub async fn update_category(
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
    tag = "Categories",
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
pub async fn delete_category(
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
    tag = "Categories",
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
pub async fn get_category_types(
    Path(user_id): Path<Uuid>,
    CategoryTypeServiceState(category_type_service): CategoryTypeServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<GetCategoryTypesResponseViewModel>, ApiError> {
    let types = category_type_service.get_category_types(user_id).await?;

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
    tag = "Categories",
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
pub async fn create_category_type(
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
    tag = "Categories",
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
pub async fn update_category_type(
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
    tag = "Categories",
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
pub async fn delete_category_type(
    Path((user_id, type_id)): Path<(Uuid, i32)>,
    CategoryTypeServiceState(category_type_service): CategoryTypeServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<StatusCode, ApiError> {
    category_type_service
        .delete_category_type(type_id, user_id)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}
