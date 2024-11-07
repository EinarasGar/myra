use std::str::FromStr;

use dal::{
    models::user_models::UserAuthModel,
    queries::user_queries::{self},
};

#[mockall_double::double]
use dal::database_context::MyraDb;

use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};

use crate::dtos::{auth_dto::ClaimsDto, user_role_dto::UserRoleEnumDto};

use super::user_service::UsersService;

pub struct AuthService {
    jwt_keys: JwtKeys,
    db_context: MyraDb,
    user_service: UsersService,
}

struct JwtKeys {
    encoding: EncodingKey,
    decoding: DecodingKey,
}

impl JwtKeys {
    fn new(secret: &[u8]) -> Self {
        Self {
            encoding: EncodingKey::from_secret(secret),
            decoding: DecodingKey::from_secret(secret),
        }
    }
}

impl AuthService {
    pub fn new(db: MyraDb) -> Self {
        let secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");
        let jwt_keys = JwtKeys::new(secret.as_bytes());
        Self {
            db_context: db.clone(),
            jwt_keys,
            user_service: UsersService::new(db),
        }
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn get_auth_token(
        &self,
        username: String,
        password: String,
    ) -> anyhow::Result<String> {
        let query = user_queries::get_user_auth_info(username);

        let user_auth_info = self.db_context.fetch_one::<UserAuthModel>(query).await?;

        self.user_service
            .verify_user_password(password, user_auth_info.password_hash)?;

        let my_claims = ClaimsDto {
            sub: user_auth_info.id,
            exp: jsonwebtoken::get_current_timestamp() + 6000,
            role: UserRoleEnumDto::from_str(&user_auth_info.user_role_name).unwrap(),
        };

        let token = encode(&Header::default(), &my_claims, &self.jwt_keys.encoding).unwrap();
        Ok(token)
    }

    #[tracing::instrument(skip_all, err)]
    pub fn verify_auth_token(&self, token: String) -> anyhow::Result<ClaimsDto> {
        let token_message =
            decode::<ClaimsDto>(&token, &self.jwt_keys.decoding, &Validation::default())?;
        Ok(token_message.claims)
    }
}
