use axum::{
    async_trait,
    extract::{FromRef, FromRequestParts},
    http::{request::Parts, StatusCode},
};

use business::service_collection::{
    asset_rates_service::AssetRatesService, asset_service::AssetsService,
    auth_service::AuthService, entries_service::EntriesService,
    portfolio_overview_service::PortfolioOverviewService, portfolio_service::PortfolioService,
    transaction_management_service::TransactionManagementService,
    transaction_service::TransactionService, user_service::UsersService,
};

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) services_collection: business::service_collection::Services,
}

macro_rules! service_state {
    ($name:ident, $service:ty) => {
        pub struct $name(pub $service);

        impl FromRef<AppState> for $service {
            fn from_ref(state: &AppState) -> $service {
                let db = state.services_collection.get_db_instance();
                <$service>::new(db)
            }
        }

        #[async_trait]
        impl<S> FromRequestParts<S> for $name
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
    };
}

service_state!(UsersServiceState, UsersService);
service_state!(AuthServiceState, AuthService);
service_state!(TransactionServiceState, TransactionService);
service_state!(
    TransactionManagementServiceState,
    TransactionManagementService
);
service_state!(PortfolioServiceState, PortfolioService);
service_state!(AssetsServiceState, AssetsService);
service_state!(AssetRatesServiceState, AssetRatesService);
service_state!(PortfolioOverviewServiceState, PortfolioOverviewService);
service_state!(EntriesServiceState, EntriesService);
