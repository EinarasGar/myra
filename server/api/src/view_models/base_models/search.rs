use business::dtos::paging_dto::PaginationModeDto;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::view_models::{
    assets::{base_models::lookup::AssetLookupTables, get_assets::GetAssetsLineResponseViewModel},
    categories::base_models::{
        category::IdentifiableCategoryViewModel, metadata_lookup::CategoryMetadataLookupTables,
    },
    transactions::{
        base_models::metadata_lookup::MetadataLookupTables,
        get_transaction_group::GetTransactionGroupLineResponseViewModel,
        get_transactions::CombinedTransactionItemViewModel,
        transaction_types::RequiredIdentifiableTransactionWithIdentifiableEntries,
    },
};

pub type PageOfAssetsResultsWithLookupViewModel =
    PageOfResults<GetAssetsLineResponseViewModel, AssetLookupTables>;
pub type PageOfIndividualTransactionsWithLookupViewModel =
    PageOfResults<RequiredIdentifiableTransactionWithIdentifiableEntries, MetadataLookupTables>;
pub type SearchCategoriesResponseViewModel =
    PageOfResults<IdentifiableCategoryViewModel, CategoryMetadataLookupTables>;

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct PageOfResults<T, L> {
    /// One page of results
    #[schema(inline = false)]
    pub results: Vec<T>,

    /// The total number of results available
    #[schema(example = 2203)]
    pub total_results: i32,

    /// The lookup tables for the results
    #[schema(inline = false)]
    pub lookup_tables: L,
}

#[derive(Clone, Debug, Serialize, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
#[serde(default)]
pub struct PaginatedSearchQuery {
    #[param(maximum = 100, minimum = 1, example = 10)]
    /// How many items to return in a single page
    pub count: u64,

    /// The index in the list of the fist element of the page.
    #[param(minimum = 0, example = 30)]
    pub start: u64,

    /// The search query
    pub query: Option<String>,
}

impl Default for PaginatedSearchQuery {
    fn default() -> Self {
        Self {
            count: 10,
            start: 0,
            query: None,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
pub struct CursorOrPageOfResults<T, L> {
    #[schema(inline = false)]
    pub results: Vec<T>,
    pub has_more: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<Uuid>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_results: Option<i64>,
    #[schema(inline = false)]
    pub lookup_tables: L,
}

#[derive(Clone, Debug, Serialize, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
#[serde(default)]
pub struct CursorOrPaginatedSearchQuery {
    #[param(maximum = 100, minimum = 1, example = 10)]
    pub limit: u64,
    pub cursor: Option<Uuid>,
    #[param(minimum = 0, example = 0)]
    pub start: Option<u64>,
    #[param(maximum = 100, minimum = 1)]
    pub count: Option<u64>,
    pub query: Option<String>,
}

impl Default for CursorOrPaginatedSearchQuery {
    fn default() -> Self {
        Self {
            limit: 10,
            cursor: None,
            start: None,
            count: None,
            query: None,
        }
    }
}

const MAX_PAGE_SIZE: u64 = 100;

impl From<&CursorOrPaginatedSearchQuery> for PaginationModeDto {
    fn from(query: &CursorOrPaginatedSearchQuery) -> Self {
        if let Some(cursor_id) = query.cursor {
            PaginationModeDto::Cursor {
                cursor_id,
                limit: query.limit.min(MAX_PAGE_SIZE),
            }
        } else if let (Some(start), Some(count)) = (query.start, query.count) {
            PaginationModeDto::Offset {
                start,
                count: count.min(MAX_PAGE_SIZE),
            }
        } else {
            PaginationModeDto::CursorFirstPage {
                limit: query.limit.min(MAX_PAGE_SIZE),
            }
        }
    }
}

pub type CursorPageOfIndividualTransactionsWithLookupViewModel = CursorOrPageOfResults<
    RequiredIdentifiableTransactionWithIdentifiableEntries,
    MetadataLookupTables,
>;
pub type CursorPageOfTransactionGroupsWithLookupViewModel =
    CursorOrPageOfResults<GetTransactionGroupLineResponseViewModel, MetadataLookupTables>;
pub type CursorPageOfCombinedTransactionsWithLookupViewModel =
    CursorOrPageOfResults<CombinedTransactionItemViewModel, MetadataLookupTables>;
