use dal::{
    file_provider::FileProvider,
    models::{
        connector_models::ConnectorConnectionRow,
        file_models::UserFileStorageKeysModel,
        user_models::{
            AddUserModel, UserBasicModel, UserFullModel, UserOnboardingModel, UserRoleModel,
        },
    },
    queries::{connector_queries, file_queries, user_queries},
    query_params::connector_params::GetConnectorConnectionsParams,
    secrets::SecretProvider,
};

#[cfg(feature = "clerk")]
use dal::models::user_models::ExternalUserIdModel;

#[mockall_double::double]
use dal::database_context::MyraDb;

use std::sync::Arc;
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
    file_provider: Arc<dyn FileProvider>,
    secret_provider: Arc<dyn SecretProvider>,
}

impl UsersService {
    pub fn new(providers: &super::ServiceProviders) -> Self {
        Self {
            db: providers.db.clone(),
            file_provider: providers.file_provider.clone(),
            secret_provider: providers.secret_provider.clone(),
        }
    }

    #[tracing::instrument(level = "debug", skip_all)]
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
            default_ticker: None,
            onboarding_version: 0,
        };

        Ok(ret_obj)
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn get_onboarding_info(
        &self,
        user_id: Uuid,
    ) -> anyhow::Result<(Option<i32>, Option<String>, i32)> {
        let query = user_queries::get_user_onboarding_info(user_id);
        let model = self.db.fetch_one::<UserOnboardingModel>(query).await?;
        Ok((
            model.default_asset,
            model.default_ticker,
            model.onboarding_version,
        ))
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id, asset_id = %asset_id))]
    pub async fn set_default_asset(&self, user_id: Uuid, asset_id: i32) -> anyhow::Result<()> {
        let query = user_queries::update_user_default_asset(user_id, asset_id);
        self.db.execute(query).await?;
        Ok(())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn get_default_asset(&self, user_id: Uuid) -> anyhow::Result<Option<i32>> {
        let query = user_queries::get_user_basic_info(user_id);
        let model = self.db.fetch_one::<UserBasicModel>(query).await?;
        Ok(model.default_asset)
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id, version))]
    pub async fn set_onboarding_version(&self, user_id: Uuid, version: i32) -> anyhow::Result<()> {
        let query = user_queries::update_user_onboarding_version(user_id, version);
        self.db.execute(query).await?;
        Ok(())
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn get_basic_user(
        &self,
        user_id: Uuid,
    ) -> anyhow::Result<(Uuid, String, Option<i32>)> {
        let query = user_queries::get_user_basic_info(user_id);
        let model = self.db.fetch_one::<UserBasicModel>(query).await?;
        Ok((model.id, model.username, model.default_asset))
    }

    #[tracing::instrument(level = "debug", skip_all, fields(user_id = %user_id))]
    pub async fn get_full_user(&self, user_id: Uuid) -> anyhow::Result<UserFullDto> {
        let query = user_queries::get_user_full_info(user_id);
        let model = self.db.fetch_one::<UserFullModel>(query).await?;

        Ok(model.into())
    }

    #[tracing::instrument(level = "debug", skip_all)]
    fn hash_password(&self, password: String) -> String {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .unwrap()
            .to_string();
        password_hash
    }

    #[tracing::instrument(level = "debug", skip_all)]
    pub fn verify_user_password(
        &self,
        password: String,
        password_hash: String,
    ) -> anyhow::Result<()> {
        let parsed_hash = PasswordHash::new(&password_hash)?;
        Argon2::default().verify_password(password.as_bytes(), &parsed_hash)?;
        Ok(())
    }

    #[tracing::instrument(level = "info", skip_all, fields(user_id = %user_id))]
    pub async fn delete_user(&self, user_id: Uuid) -> anyhow::Result<()> {
        let files_query = file_queries::get_files_by_user(user_id);
        let files: Vec<UserFileStorageKeysModel> = self.db.fetch_all(files_query).await?;
        for file in &files {
            if let Err(e) = self.file_provider.delete(&file.storage_key).await {
                tracing::warn!(error = %e, "failed to delete user file from storage during account deletion");
            }
            if let Some(ref thumbnail_key) = file.thumbnail_key {
                if let Err(e) = self.file_provider.delete(thumbnail_key).await {
                    tracing::warn!(error = %e, "failed to delete user thumbnail from storage during account deletion");
                }
            }
        }

        let connections_query = connector_queries::get_connector_connections(
            GetConnectorConnectionsParams::all(user_id),
        );
        let connections: Vec<ConnectorConnectionRow> = self.db.fetch_all(connections_query).await?;
        for connection in &connections {
            let secret_key = crate::providers::connector_store::credential_ref(connection.id);
            if let Err(e) = self.secret_provider.delete_secret(&secret_key).await {
                tracing::warn!(error = %e, "failed to delete connector secret during account deletion");
            }
        }

        #[cfg(feature = "clerk")]
        let external_user_id = {
            let query = user_queries::get_external_identity_by_user(user_id, "clerk".to_string());
            self.db
                .fetch_optional::<ExternalUserIdModel>(query)
                .await?
                .map(|model| model.external_user_id)
        };

        self.db.start_transaction().await?;
        let groups_query = user_queries::delete_transaction_groups_by_user(user_id);
        self.db.execute(groups_query).await?;
        let user_query = user_queries::delete_user(user_id);
        self.db.execute(user_query).await?;
        self.db.commit_transaction().await?;

        #[cfg(feature = "clerk")]
        if let Some(external_user_id) = external_user_id {
            if let Err(e) = self.delete_clerk_user(&external_user_id).await {
                tracing::warn!(error = %e, "failed to delete Clerk user after account deletion");
            }
        }

        Ok(())
    }

    #[cfg(feature = "clerk")]
    async fn delete_clerk_user(&self, external_user_id: &str) -> anyhow::Result<()> {
        let clerk_secret_key = std::env::var("CLERK_SECRET_KEY").map_err(|_| {
            anyhow::anyhow!("CLERK_SECRET_KEY must be set when using clerk auth feature")
        })?;
        let client = reqwest::Client::new();
        let response = client
            .delete(format!("https://api.clerk.com/v1/users/{external_user_id}"))
            .header("Authorization", format!("Bearer {clerk_secret_key}"))
            .send()
            .await
            .map_err(|e| anyhow::anyhow!("failed to send Clerk delete request: {e}"))?;
        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "Clerk user deletion returned status {}",
                response.status()
            ));
        }
        Ok(())
    }
}
