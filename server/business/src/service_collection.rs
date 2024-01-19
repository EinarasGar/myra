use dal::database_connection::MyraDbConnection;
#[mockall_double::double]
use dal::database_context::MyraDb;
pub mod asset_service;
pub mod auth_service;
pub mod portfolio_overview_service;
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
}
