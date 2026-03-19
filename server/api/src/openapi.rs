use crate::errors::{ApiErrorResponse, ErrorType, FieldError};
use utoipa::OpenApi;

use self::{
    cleanup::OpenApiDocumentCleanup,
    modifiers::{DeriveDiscriminatorMapping, OneOfToAnyOfTransformer, SecurityAddon},
};

use crate::view_models::{
    accounts::base_models::{
        account_id::{AccountId, RequiredAccountId},
        account_type_id::AccountTypeId,
        liquidity_type_id::{LiquidityTypeId, RequiredLiquidityTypeId},
    },
    assets::base_models::{
        asset_id::{AssetId, RequiredAssetId},
        asset_type_id::{AssetTypeId, RequiredAssetTypeId},
    },
    categories::base_models::category_type_id::RequiredCategoryTypeId,
    transactions::base_models::{
        category_id::{CategoryId, RequiredCategoryId},
        entry_id::{EntryId, RequiredEntryId},
        transaction_group_id::TransactionGroupId,
        transaction_id::{RequiredTransactionId, TransactionId},
    },
    users::base_models::user_id::{RequiredUserId, UserId},
};

mod cleanup;
mod modifiers;

#[derive(OpenApi)]
#[openapi(
    info(
        title = "Sverto Personal Finance API",
        description = "A comprehensive personal finance management API for tracking investments, expenses, and net worth over time. Features include transaction management, portfolio tracking, asset management, and detailed financial reporting.",
        version = "1.0.0",
        contact(
            name = "API Support",
            email = "einaras.garbasauskas@gmail.com"
        )
    ),
    servers(
        (url = "http://localhost:5000", description = "Local development server")
    ),
    paths(
        super::handlers::transaction_groups::add_transaction_group,
        super::handlers::transaction_groups::group_individual_transactions,
        super::handlers::transaction_groups::update_transaction_group,
        super::handlers::transaction_groups::delete_transaction_group,
        super::handlers::transaction_groups::get_transaction_groups,
        super::handlers::transactions::update_transaction,
        super::handlers::transactions::delete_transaction,
        super::handlers::transactions::get_transactions,
        super::handlers::individual_transactions::add_individual_transaction,
        super::handlers::individual_transactions::update_individual_transaction,
        super::handlers::individual_transactions::get_individual_transactions,
        super::handlers::individual_transactions::get_single,
        super::handlers::auth_handler::post_login_details,
        super::handlers::auth_handler::post_refresh_token,
        super::handlers::auth_handler::post_logout,
        super::handlers::auth_handler::get_me,
        super::handlers::user_handler::post_user,
        super::handlers::user_asset_handler::delete_asset,
        super::handlers::user_asset_handler::delete_asset_pair_rates,
        super::handlers::user_asset_handler::delete_asset_pair,
        super::handlers::user_asset_handler::post_custom_asset_rates,
        super::handlers::user_asset_handler::post_custom_asset,
        super::handlers::user_asset_handler::put_custom_asset,
        super::handlers::user_asset_handler::get_user_asset,
        super::handlers::user_asset_handler::get_user_asset_pair,
        super::handlers::user_asset_handler::get_user_asset_pair_rates,
        super::handlers::user_asset_handler::put_custom_asset_pair,
        super::handlers::user_asset_handler::get_user_assets,
        super::handlers::user_asset_handler::post_asset_pair,
        super::handlers::asset_handler::get_asset,
        super::handlers::asset_handler::get_asset_pair,
        super::handlers::asset_handler::get_asset_pair_rates,
        super::handlers::asset_handler::search_assets,
        super::handlers::asset_handler::get_asset_types,
        super::handlers::accounts_handler::get_account,
        super::handlers::accounts_handler::get_accounts,
        super::handlers::accounts_handler::update_account,
        super::handlers::accounts_handler::add_account,
        super::handlers::accounts_handler::delete_account,
        super::handlers::accounts_handler::get_account_types,
        super::handlers::accounts_handler::get_account_liquidity_types,
        super::handlers::portfolio_handler::get_networth_history,
        super::handlers::portfolio_handler::get_holdings,
        super::handlers::portfolio_handler::get_portfolio_overview,
        super::handlers::account_portfolio_handler::get_account_networth_history,
        super::handlers::account_portfolio_handler::get_account_portfolio_overview,
        super::handlers::account_portfolio_handler::get_account_transactions,
        super::handlers::category_handler::search_categories,
        super::handlers::category_handler::get_category_types,
        super::handlers::user_category_handler::get_categories,
        super::handlers::user_category_handler::get_user_category,
        super::handlers::user_category_handler::post_user_category,
        super::handlers::user_category_handler::put_user_category,
        super::handlers::user_category_handler::delete_user_category,
        super::handlers::user_category_handler::get_user_category_types,
        super::handlers::user_category_handler::post_user_category_type,
        super::handlers::user_category_handler::put_user_category_type,
        super::handlers::user_category_handler::delete_user_category_type,
        super::handlers::file_handler::create_file,
        super::handlers::file_handler::get_file,
        super::handlers::file_handler::delete_file,
        super::handlers::file_handler::confirm_file,
        super::handlers::file_handler::get_file_url,
        super::handlers::file_handler::get_file_thumbnail,
    ),
    components(
        schemas(RequiredEntryId),
        schemas(EntryId),
        schemas(RequiredTransactionId),
        schemas(TransactionId),
        schemas(TransactionGroupId),
        schemas(AccountTypeId),
        schemas(RequiredAccountId),
        schemas(AccountId),
        schemas(RequiredLiquidityTypeId),
        schemas(LiquidityTypeId),
        schemas(RequiredAssetId),
        schemas(AssetId),
        schemas(RequiredAssetTypeId),
        schemas(AssetTypeId),
        schemas(RequiredCategoryId),
        schemas(CategoryId),
        schemas(RequiredUserId),
        schemas(UserId),
        schemas(ApiErrorResponse),
        schemas(FieldError),
        schemas(ErrorType),
        schemas(RequiredCategoryTypeId),
    ),
    modifiers(
        &SecurityAddon,
        &DeriveDiscriminatorMapping,
        &OneOfToAnyOfTransformer,
    ),
    tags(
        (
            name = "Sverto Personal Finance API",
            description = include_str!("openapi/overview.md")
        )
    )
)]
pub struct ApiDoc;

pub fn build_openapi_json() -> String {
    OpenApiDocumentCleanup::to_pretty_json(ApiDoc::openapi())
}
