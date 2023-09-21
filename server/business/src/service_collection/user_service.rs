use dal::{
    database_context::MyraDb,
    db_sets::{
        portfolio_db_set::{self},
        user_db_set::{self},
    },
    models::{
        portfolio_models::PortfolioAccountModel,
        user_models::{AddUserModel, UserFullModel, UserRoleModel},
    },
};

use uuid::Uuid;

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};

use crate::dtos::{
    add_user_dto::AddUserDto, portfolio_account_dto::PortfolioAccountDto,
    user_full_dto::UserFullDto,
};



#[derive(Clone)]
pub struct UsersService {
    db: MyraDb,
}

impl UsersService {
    pub fn new(db: MyraDb) -> Self {
        Self { db }
    }

    #[tracing::instrument(skip(self, user), ret, err)]
    pub async fn register_user(
        &self,
        user: AddUserDto,
    ) -> anyhow::Result<(UserFullDto, PortfolioAccountDto)> {
        let new_user_id: Uuid = Uuid::new_v4();
        let db_user: AddUserModel = AddUserModel {
            id: new_user_id,
            username: user.username.clone(),
            password: self.hash_password(user.password),
            default_asset: user.default_asset,
            role_id: None,
        };

        let default_portfolio_account = PortfolioAccountModel {
            id: new_user_id,
            user_id: new_user_id,
            name: "Default".to_string(),
        };

        self.db.get_transaction().await?;

        let (sql, values) = user_db_set::inset_user(db_user);
        self.db.execute_in_trans(sql, values).await?;
        let (sql, values) = user_db_set::get_user_role(new_user_id);
        let user_role = self
            .db
            .fetch_one_in_trans::<UserRoleModel>(sql, values)
            .await?;
        let (sql, values) =
            portfolio_db_set::insert_or_update_portfolio_account(default_portfolio_account.clone());
        self.db.execute_in_trans(sql, values).await?;

        self.db.commit_transaction().await?;

        let ret_obj = UserFullDto {
            id: new_user_id,
            username: user.username,
            role: user_role.into(),
            default_asset_id: user.default_asset,
        };

        Ok((ret_obj, default_portfolio_account.into()))
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub async fn get_full_user(&self, user_id: Uuid) -> anyhow::Result<UserFullDto> {
        let (sql, values) = user_db_set::get_user_full_info(user_id);
        let model = self.db.fetch_one::<UserFullModel>(sql, values).await?;

        Ok(model.into())
    }

    #[tracing::instrument(skip_all, ret)]
    fn hash_password(&self, password: String) -> String {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .unwrap()
            .to_string();
        password_hash
    }

    #[tracing::instrument(skip(self, password), err)]
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
