use business::dtos::paging_dto::PaginationModeDto;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::view_models::{
    assets::{base_models::lookup::AssetLookupTables, get_assets::GetAssetsLineResponseViewModel},
    categories::base_models::{
        category::CategoryWithId, metadata_lookup::CategoryMetadataLookupTables,
    },
    transactions::{
        base_models::metadata_lookup::MetadataLookupTables,
        get_transaction_group::GetTransactionGroupLineResponseViewModel,
        get_transactions::CombinedTransactionItemViewModel,
        transaction_types::RequiredTransactionWithId,
    },
};

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

macro_rules! define_page_schema {
    ($name:ident, $item:ty, $lookup:ty) => {
        #[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
        pub struct $name {
            /// One page of results
            #[schema(inline = false)]
            pub results: Vec<$item>,

            /// The total number of results available
            #[schema(example = 2203)]
            pub total_results: i32,

            /// The lookup tables for the results
            #[schema(inline = false)]
            pub lookup_tables: $lookup,
        }
    };
}

macro_rules! define_cursor_page_schema {
    ($name:ident, $item:ty, $lookup:ty) => {
        #[derive(Clone, Debug, Serialize, Deserialize, ToSchema)]
        pub struct $name {
            #[schema(inline = false)]
            pub results: Vec<$item>,
            pub has_more: bool,
            #[serde(skip_serializing_if = "Option::is_none")]
            pub next_cursor: Option<Uuid>,
            #[serde(skip_serializing_if = "Option::is_none")]
            pub total_results: Option<i64>,
            #[schema(inline = false)]
            pub lookup_tables: $lookup,
        }
    };
}

define_page_schema!(
    AssetsPage,
    GetAssetsLineResponseViewModel,
    AssetLookupTables
);
define_page_schema!(
    AccountTransactionsPage,
    RequiredTransactionWithId,
    MetadataLookupTables
);
define_page_schema!(
    SearchCategoriesResponseViewModel,
    CategoryWithId,
    CategoryMetadataLookupTables
);

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

define_cursor_page_schema!(
    IndividualTransactionsPage,
    RequiredTransactionWithId,
    MetadataLookupTables
);
define_cursor_page_schema!(
    TransactionGroupsPage,
    GetTransactionGroupLineResponseViewModel,
    MetadataLookupTables
);
define_cursor_page_schema!(
    CombinedTransactionsPage,
    CombinedTransactionItemViewModel,
    MetadataLookupTables
);
