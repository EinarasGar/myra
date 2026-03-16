use dal::{
    models::user_models::{AddUserModel, UserBasicModel, UserFullModel, UserRoleModel},
    queries::user_queries,
};

#[mockall_double::double]
use dal::database_context::MyraDb;

use uuid::Uuid;

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};

use crate::dtos::{
    add_user_dto::AddUserDto,
    user_full_dto::UserFullDto,
    user_role_dto::{UserRoleDto, UserRoleEnumDto},
};

pub struct UsersService {
    db: MyraDb,
}

impl UsersService {
    pub fn new(db: MyraDb) -> Self {
        Self { db }
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn register_user(&self, user: AddUserDto) -> anyhow::Result<UserFullDto> {
        let db_user = AddUserModel {
            username: user.username.clone(),
            default_asset: user.default_asset,
        };

        self.db.start_transaction().await?;

        let query = user_queries::insert_user(db_user);
        let new_user_id: Uuid = self.db.fetch_one_scalar(query).await?;

        // Insert credentials only if a password was provided (database auth)
        if let Some(password) = user.password {
            let hash = self.hash_password(password);
            let cred_query = user_queries::insert_user_credentials(new_user_id, hash);
            self.db.execute(cred_query).await?;
        }

        let role_dto = if user.assign_default_role {
            let role_query = user_queries::insert_user_role_assignment(new_user_id, 1);
            self.db.execute(role_query).await?;

            let query = user_queries::get_user_role(new_user_id);
            let user_role = self.db.fetch_optional::<UserRoleModel>(query).await?;
            match user_role {
                Some(role) => role.into(),
                None => UserRoleDto {
                    role_id: 1,
                    role: UserRoleEnumDto::User,
                },
            }
        } else {
            UserRoleDto {
                role_id: 0,
                role: UserRoleEnumDto::User,
            }
        };

        self.db.commit_transaction().await?;

        let ret_obj = UserFullDto {
            id: new_user_id,
            username: user.username,
            role: role_dto,
            default_asset_id: user.default_asset,
        };

        Ok(ret_obj)
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_basic_user(&self, user_id: Uuid) -> anyhow::Result<(Uuid, String, i32)> {
        let query = user_queries::get_user_basic_info(user_id);
        let model = self.db.fetch_one::<UserBasicModel>(query).await?;
        Ok((model.id, model.username, model.default_asset))
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_full_user(&self, user_id: Uuid) -> anyhow::Result<UserFullDto> {
        let query = user_queries::get_user_full_info(user_id);
        let model = self.db.fetch_one::<UserFullModel>(query).await?;

        Ok(model.into())
    }

    #[tracing::instrument(skip_all)]
    fn hash_password(&self, password: String) -> String {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .unwrap()
            .to_string();
        password_hash
    }

    #[tracing::instrument(skip_all, err)]
    pub fn verify_user_password(
        &self,
        password: String,
        password_hash: String,
    ) -> anyhow::Result<()> {
        let parsed_hash = PasswordHash::new(&password_hash)?;
        Argon2::default().verify_password(password.as_bytes(), &parsed_hash)?;
        Ok(())
    }
}
