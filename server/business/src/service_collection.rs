use dal::database_connection::MyraDbConnection;
#[mockall_double::double]
use dal::database_context::MyraDb;

use self::{
    asset_service::AssetsService, auth_service::AuthService, portfolio_service::PortfolioService,
    transaction_service::TransactionService, user_service::UsersService,
};

pub mod asset_service;
pub mod auth_service;
pub mod portfolio_service;
pub mod transaction_service;
pub mod user_service;

#[derive(Clone)]
pub struct Services {
    pub connection: MyraDbConnection,
}

impl Services {
    pub async fn new() -> anyhow::Result<Self> {
        let connection = MyraDbConnection::new().await.unwrap();

        Ok(Services { connection })
    }

    pub fn get_db_instance(&self) -> MyraDb {
        MyraDb::new(self.connection.clone())
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
