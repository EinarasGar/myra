use axum::{
    extract::{FromRef, FromRequestParts},
    http::{request::Parts, StatusCode},
};

use business::service_collection::{
    accounts_service::AccountsService, asset_rates_service::AssetRatesService,
    asset_service::AssetsService, auth_service::AuthService, entries_service::EntriesService,
    portfolio_overview_service::PortfolioOverviewService, portfolio_service::PortfolioService,
    transaction_management_service::TransactionManagementService,
    transaction_service::TransactionService, user_service::UsersService,
};

use paste::paste;

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) services_collection: business::service_collection::Services,
}

macro_rules! service_state {
    ($service:ident) => {
        paste! {

            #[allow(dead_code)]
            pub struct [<$service State>](pub $service);

            impl FromRef<AppState> for $service {
                fn from_ref(state: &AppState) -> $service {
                    let db = state.services_collection.get_db_instance();
                    <$service>::new(db)
                }
            }

            impl<S> FromRequestParts<S> for [<$service State>]
            where
                $service: FromRef<S>,
                S: Send + Sync,
            {
                type Rejection = (StatusCode, String);

                async fn from_request_parts(
                    _parts: &mut Parts,
                    state: &S,
                ) -> Result<Self, Self::Rejection> {
                    let conn = <$service>::from_ref(state);
                    Ok(Self(conn))
                }
            }
        }
    };
}

// Usage
service_state!(UsersService);
service_state!(AuthService);
service_state!(TransactionService);
service_state!(TransactionManagementService);
service_state!(PortfolioService);
service_state!(AssetsService);
service_state!(AssetRatesService);
service_state!(PortfolioOverviewService);
service_state!(EntriesService);
service_state!(AccountsService);
