use self::auth_service::AuthService;
use self::users_service::UsersService;

pub mod auth_service;
pub mod users_service;

#[derive(Clone)]
pub struct Services {
    pub users_service: UsersService,
    pub auth_service: AuthService,
    // pub AuthenticationService: authentication_serice::AuthenticationService,
}

impl Services {
    pub async fn new() -> anyhow::Result<Self> {
        let context = dal::database_context::MyraDb::new().await.unwrap();

        let users_service = UsersService::new(context.users_db_set.clone());

        let auth_service = AuthService::new(context.users_db_set, users_service.clone());

        let serices = Services {
            users_service,
            auth_service, // AuthenticationService: authentication_serice,
        };
        Ok(serices)
    }
}
