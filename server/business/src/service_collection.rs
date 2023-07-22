use self::asset_service::AssetsService;
use self::auth_service::AuthService;
use self::portfolio_service::PortfolioService;
use self::transaction_service::TransactionService;
use self::user_service::UsersService;

pub mod asset_service;
pub mod auth_service;
pub mod portfolio_service;
pub mod transaction_service;
pub mod user_service;

#[derive(Clone)]
pub struct Services {
    pub users_service: UsersService,
    pub auth_service: AuthService,
    pub transaction_service: TransactionService,
    pub portfolio_service: PortfolioService,
    pub assets_service: AssetsService,
}

impl Services {
    pub async fn new() -> anyhow::Result<Self> {
        let context = dal::database_context::MyraDb::new().await.unwrap();

        let users_service = UsersService::new(context.clone());
        let auth_service = AuthService::new(context.clone(), users_service.clone());
        let transaction_service = TransactionService::new(context.clone());
        let portfolio_service = PortfolioService::new(context.clone());
        let assets_service = AssetsService::new(context);

        let serices = Services {
            users_service,
            auth_service,
            transaction_service,
            portfolio_service,
            assets_service,
        };
        Ok(serices)
    }
}
