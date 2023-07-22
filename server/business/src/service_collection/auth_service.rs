use std::str::FromStr;

use dal::{database_context::MyraDb, db_sets::user_db_set::UsersDbSet};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};

use crate::{
    dtos::{auth_dto::ClaimsDto, user_role_dto::UserRoleEnumDto},
    service_collection::user_service::UsersService,
};

#[derive(Clone)]
pub struct AuthService {
    jwt_keys: JwtKeys,
    db_context: MyraDb,
    user_service: UsersService,
}

#[derive(Clone)]
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
    pub fn new(db: MyraDb, user_service: UsersService) -> Self {
        let secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");
        let jwt_keys = JwtKeys::new(secret.as_bytes());
        Self {
            jwt_keys,
            db_context: db,
            user_service,
        }
    }

    #[tracing::instrument(skip(self, password), ret, err)]
    pub async fn get_auth_token(
        &self,
        username: String,
        password: String,
    ) -> anyhow::Result<String> {
        let mut conn = self.db_context.get_connection().await?;
        let user_auth_info = conn.get_user_auth_info(username).await?;

        self.user_service
            .verify_user_password(password, user_auth_info.password)?;

        let my_claims = ClaimsDto {
            sub: user_auth_info.id,
            exp: jsonwebtoken::get_current_timestamp() + 6000,
            role: UserRoleEnumDto::from_str(&user_auth_info.role).unwrap(),
        };

        let token = encode(&Header::default(), &my_claims, &self.jwt_keys.encoding).unwrap();
        Ok(token)
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub fn verify_auth_token(&self, token: String) -> anyhow::Result<ClaimsDto> {
        let token_message =
            decode::<ClaimsDto>(&token, &self.jwt_keys.decoding, &Validation::default())?;
        Ok(token_message.claims)
    }
}
