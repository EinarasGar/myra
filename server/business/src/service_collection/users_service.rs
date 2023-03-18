use anyhow::Ok;
use dal::{db_sets::users::UsersDbSet, models::user::UserModel};
use uuid::Uuid;

use crate::models::user::AddUserDto;

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};

#[derive(Clone)]
pub struct UsersService {
    users_db_set: UsersDbSet,
}

impl UsersService {
    pub fn new(users_db_set: UsersDbSet) -> Self {
        Self { users_db_set }
    }

    pub async fn register_user(&self, user: AddUserDto) -> anyhow::Result<Uuid> {
        let new_user_id: Uuid = Uuid::new_v4();
        let db_user: UserModel = UserModel {
            id: new_user_id,
            username: user.username,
            password: self.hash_password(user.password),
            default_asset: user.default_asset,
        };

        self.users_db_set.inset_user(db_user).await?;
        Ok(new_user_id)
    }

    fn hash_password(&self, password: String) -> String {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .unwrap()
            .to_string();
        return password_hash;
    }

    pub fn verify_user_password(
        &self,
        password: String,
        password_hash: String,
    ) -> anyhow::Result<()> {
        let parsed_hash = PasswordHash::new(&password_hash)?;
        Argon2::default().verify_password(password.as_bytes(), &parsed_hash)?;
        Ok({})
    }
}

#[cfg(test)]
mod tests {
    use dal::database_context;

    use crate::service_collection::users_service;

    async fn get_users_service() -> users_service::UsersService {
        let context = database_context::MyraDb::new().await.unwrap();
        let users_service = users_service::UsersService::new(context.users_db_set);
        return users_service;
    }

    #[tokio::test]
    async fn test_verify_correct_password() {
        //arrange
        let users_service = get_users_service().await;
        let password = "password".to_string();
        let hashed = "$argon2id$v=19$m=19456,t=2,p=1$cA/2g90uUzqvdHXniTwyBA$WIbpl9GH5JD93dpkDT8gHkMQOMeeNZkqhI5OKUS8/uc".to_string();
        //act
        let result = users_service.verify_user_password(password, hashed);

        //assert
        assert!(result.is_ok())
    }

    #[tokio::test]
    async fn test_verify_incorrect_password() {
        //arrange
        let users_service = get_users_service().await;
        let password = "incorrect_password".to_string();
        let hashed = "$argon2id$v=19$m=19456,t=2,p=1$cA/2g90uUzqvdHXniTwyBA$WIbpl9GH5JD93dpkDT8gHkMQOMeeNZkqhI5OKUS8/uc".to_string();
        //act
        let result = users_service.verify_user_password(password, hashed);

        //assert
        assert!(result.is_err())
    }

    #[tokio::test]
    async fn test_hash_and_verify() {
        //arrange
        let users_service = get_users_service().await;
        let password = "random_password".to_string();

        //act
        let hashed = users_service.hash_password(password.clone());
        let result = users_service.verify_user_password(password, hashed);

        //assert
        assert!(result.is_ok())
    }
}
