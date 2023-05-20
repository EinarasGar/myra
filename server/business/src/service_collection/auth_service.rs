
use std::str::FromStr;

use dal::{
    database_context::MyraDb, db_sets::user_db_set::UsersDbSet,
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};

use crate::{service_collection::user_service::UsersService, dtos::auth_dto::{ClaimsDto, AuthRolesDto}};

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
            role: AuthRolesDto::from_str(&user_auth_info.role).unwrap(),
        };

        let token = encode(&Header::default(), &my_claims, &self.jwt_keys.encoding).unwrap();
        Ok(token.to_string())
    }

    #[tracing::instrument(skip(self), ret, err)]
    pub fn verify_auth_token(&self, token: String) -> anyhow::Result<ClaimsDto> {
        let token_message =
            decode::<ClaimsDto>(&token, &self.jwt_keys.decoding, &Validation::default())?;
        Ok(token_message.claims)
    }
}

// #[cfg(test)]
// mod tests {
//     use dal::models::user_models::AuthRoles;

//     use super::AuthService;
//     use crate::service_collection::Services;

//     async fn get_users_service() -> AuthService {
//         return Services::new().await.unwrap().auth_service;
//     }

//     #[tokio::test]
//     async fn verify_invalid_auth_token() {
//         //arrange
//         let service = get_users_service().await;
//         let invalid_auth_token = "invalid token".to_string();

//         //act
//         let result = service.verify_auth_token(invalid_auth_token).unwrap_err();

//         //assert
//         assert_eq!(result.to_string(), "InvalidToken")
//     }

//     #[tokio::test]
//     async fn verify_expired_auth_token() {
//         //arrange
//         let service = get_users_service().await;
//         let invalid_auth_token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIyMzk2NDgwZi0wMDUyLTRjZjAtODFkYy04Y2VkYmRlNWNlMTMiLCJyb2xlIjoiQWRtaW4iLCJleHAiOjE2Nzg2NTU2ODN9.sPExGv02HNKZfHEVd5rmaHntNswfnyuAU7GTI3N0crQ".to_string();

//         //act
//         let result = service.verify_auth_token(invalid_auth_token).unwrap_err();

//         //assert
//         assert_eq!(result.to_string(), "ExpiredSignature")
//     }

//     #[tokio::test]
//     async fn verify_correct_auth_token() {
//         //arrange
//         let service = get_users_service().await;
//         let invalid_auth_token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIyMzk2NDgwZi0wMDUyLTRjZjAtODFkYy04Y2VkYmRlNWNlMTMiLCJyb2xlIjoiQWRtaW4iLCJleHAiOjE4NDQ2NzQ0MDczNzA5NTUxNjE1fQ.pRfj07JihfPK-iXcngCc1Kw3tcEJ3Pr2wYwZVqV97LY".to_string();

//         //act
//         let result = service.verify_auth_token(invalid_auth_token).unwrap();

//         //assert
//         assert_eq!(
//             result.sub.to_string(),
//             "2396480f-0052-4cf0-81dc-8cedbde5ce13"
//         );
//         assert_eq!(result.role, AuthRoles::Admin);
//         assert_eq!(result.exp, u64::MAX);
//     }

//     #[tokio::test]
//     async fn get_auth_token_correct_details() {
//         //arrange
//         let service = get_users_service().await;
//         //act
//         let auth_token = service
//             .get_auth_token("einaras".to_string(), "password".to_string())
//             .await
//             .unwrap();

//         //assert
//         assert!(auth_token.len() > 0);
//     }

//     #[tokio::test]
//     async fn get_auth_token_incorrect_username() {
//         //arrange
//         let service = get_users_service().await;
//         //act
//         let result = service
//             .get_auth_token("incorrect_username".to_string(), "password".to_string())
//             .await;

//         //assert
//         assert!(result.is_err());
//     }

//     #[tokio::test]
//     async fn get_auth_token_incorrect_password() {
//         //arrange
//         let service = get_users_service().await;
//         //act
//         let result = service
//             .get_auth_token("einaras".to_string(), "incorrect_password".to_string())
//             .await;

//         //assert
//         assert!(result.is_err());
//     }

//     #[tokio::test]
//     async fn get_auth_token_incorrect_username_and_password() {
//         //arrange
//         let service = get_users_service().await;
//         //act
//         let result = service
//             .get_auth_token(
//                 "incorrect_einaras".to_string(),
//                 "incorrect_password".to_string(),
//             )
//             .await;

//         //assert
//         assert!(result.is_err());
//     }
// }
