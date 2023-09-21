use dal::database_context::MyraDb;

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
    pub connection: dal::database_connection::MyraDbConnection,
}

impl Services {
    pub async fn new() -> anyhow::Result<Self> {
        let connection = dal::database_connection::MyraDbConnection::new()
            .await
            .unwrap();

        Ok(Services { connection })
    }

    pub fn get_db_instance(&self) -> MyraDb {
        dal::database_context::MyraDb::new(self.connection.clone())
    }

    //krc refactorinti kad vietoj to kad 1 instance butu, sukurtu nauja instance kiekviena karta
    pub fn get_users_service(db: MyraDb) -> UsersService {
        UsersService::new(db)
    }

    pub fn get_auth_service(db: MyraDb) -> AuthService {
        AuthService::new(db)
    }

    pub fn get_transaction_service(db: MyraDb) -> TransactionService {
        TransactionService::new(db)
    }

    pub fn get_portfolio_service(db: MyraDb) -> PortfolioService {
        PortfolioService::new(db)
    }

    pub fn get_assets_service(db: MyraDb) -> AssetsService {
        AssetsService::new(db)
    }
}
