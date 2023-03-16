use self::auth_service::AuthService;
use self::transaction_service::TransactionService;
use self::users_service::UsersService;

pub mod auth_service;
pub mod transaction_service;
pub mod users_service;

#[derive(Clone)]
pub struct Services {
    pub users_service: UsersService,
    pub auth_service: AuthService,
    pub transaction_service: TransactionService,
}

impl Services {
    pub async fn new() -> anyhow::Result<Self> {
        let context = dal::database_context::MyraDb::new().await.unwrap();

        let users_service = UsersService::new(context.users_db_set.clone());
        let auth_service = AuthService::new(context.users_db_set, users_service.clone());
        let transaction_service = TransactionService::new(context.transactions_db_set.clone());

        let serices = Services {
            users_service,
            auth_service,
            transaction_service,
        };
        Ok(serices)
    }
}
