use axum::{extract::Query, Json};
use itertools::Itertools;
use std::collections::HashMap;

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
            get_category_types::GetCategoryTypesResponseViewModel,
            search_categories::SearchCategoriesQuery,
        },
        errors::GetResponses,
    },
};

/// Search Categories
///
/// Retrieves a paginated list of categories accessible to the user.
/// Includes both global categories and user-specific categories.
/// Supports searching by category name or type name, and filtering by type ID.
#[utoipa::path(
    get,
    path = "/api/categories",
    tag = "Categories",
    params(
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
    Query(search_query): Query<PaginatedSearchQuery>,
    Query(query): Query<SearchCategoriesQuery>,
    CategoryServiceState(category_service): CategoryServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<SearchCategoriesResponseViewModel>, ApiError> {
    let result = category_service
        .search_categories(
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
                    is_global: category.category_type_is_global,
                },
            });
    }

    let mut categories: Vec<IdentifiableCategoryViewModel> =
        result.results.into_iter().map_into().collect();
    categories.sort_by(|a, b| b.id.0.cmp(&a.id.0));

    let response = SearchCategoriesResponseViewModel {
        results: categories,
        total_results: result.total_results,
        lookup_tables: CategoryMetadataLookupTables {
            category_types: category_types_map.into_values().collect(),
        },
    };

    Ok(Json(response))
}

/// Get Category Types
///
/// Retrieves all shared category types.
/// Does not include user-specific category types.
#[utoipa::path(
    get,
    path = "/api/categories/types",
    tag = "Categories",
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
    CategoryTypeServiceState(category_type_service): CategoryTypeServiceState,
    AuthenticatedUserState(_auth): AuthenticatedUserState,
) -> Result<Json<GetCategoryTypesResponseViewModel>, ApiError> {
    let types = category_type_service.get_category_types().await?;

    let mut category_types: Vec<IdentifiableCategoryTypeViewModel> = types.map_into().collect();
    category_types.sort_by(|a, b| b.id.0.cmp(&a.id.0));

    let response = GetCategoryTypesResponseViewModel { category_types };

    Ok(Json(response))
}
