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
    pub context: dal::database_context::MyraDb,
}

impl Services {
    pub async fn new() -> anyhow::Result<Self> {
        let context = dal::database_context::MyraDb::new().await.unwrap();

        Ok(Services { context })
    }

    pub fn get_users_service(&self) -> UsersService {
        UsersService::new(self.clone())
    }

    pub fn get_auth_service(&self) -> AuthService {
        AuthService::new(self.clone())
    }

    pub fn get_transaction_service(&self) -> TransactionService {
        TransactionService::new(self.clone())
    }

    pub fn get_portfolio_service(&self) -> PortfolioService {
        PortfolioService::new(self.clone())
    }

    pub fn get_assets_service(&self) -> AssetsService {
        AssetsService::new(self.clone())
    }
}
