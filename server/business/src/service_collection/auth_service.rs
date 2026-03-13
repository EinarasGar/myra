#[cfg(any(feature = "database", feature = "clerk"))]
use std::str::FromStr;

#[cfg(feature = "database")]
use dal::{
    models::user_models::{RefreshTokenModel, UserAuthModel},
    queries::user_queries::{self},
};

#[mockall_double::double]
use dal::database_context::MyraDb;

#[cfg(any(feature = "database", feature = "clerk"))]
use crate::dtos::{auth_dto::ClaimsDto, user_role_dto::UserRoleEnumDto};

#[cfg(feature = "database")]
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};

#[cfg(any(feature = "database", feature = "clerk"))]
use super::user_service::UsersService;

#[cfg(feature = "database")]
pub struct AuthService {
    jwt_keys: JwtKeys,
    db_context: MyraDb,
    user_service: UsersService,
}

#[cfg(feature = "database")]
struct JwtKeys {
    encoding: EncodingKey,
    decoding: DecodingKey,
}

#[cfg(feature = "database")]
impl JwtKeys {
    fn new(secret: &[u8]) -> Self {
        Self {
            encoding: EncodingKey::from_secret(secret),
            decoding: DecodingKey::from_secret(secret),
        }
    }
}

#[cfg(feature = "database")]
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
            exp: jsonwebtoken::get_current_timestamp() + 900,
            role: UserRoleEnumDto::from_str(&user_auth_info.user_role_name)?,
            username: user_auth_info.username,
        };
        let token = encode(&Header::default(), &my_claims, &self.jwt_keys.encoding)?;
        Ok(token)
    }

    #[tracing::instrument(skip_all, err)]
    pub fn verify_auth_token(&self, token: String) -> anyhow::Result<ClaimsDto> {
        let token_message =
            decode::<ClaimsDto>(&token, &self.jwt_keys.decoding, &Validation::default())?;
        Ok(token_message.claims)
    }

    pub fn generate_refresh_token() -> String {
        use base64::engine::general_purpose::URL_SAFE_NO_PAD;
        use base64::Engine;
        use rand::Rng;

        let mut bytes = [0u8; 32];
        rand::rng().fill(&mut bytes);
        URL_SAFE_NO_PAD.encode(bytes)
    }

    pub fn hash_token(token: &str) -> String {
        use sha2::{Digest, Sha256};
        let hash = Sha256::digest(token.as_bytes());
        hash.iter().map(|b| format!("{:02x}", b)).collect()
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn create_refresh_token(
        &self,
        user_id: uuid::Uuid,
    ) -> anyhow::Result<(String, time::OffsetDateTime)> {
        // Clean up expired tokens as a side-effect
        let cleanup_query = user_queries::delete_expired_refresh_tokens();
        self.db_context.execute(cleanup_query).await?;

        let raw_token = Self::generate_refresh_token();
        let token_hash = Self::hash_token(&raw_token);
        let expires_at = time::OffsetDateTime::now_utc() + time::Duration::days(7);

        let query = user_queries::insert_refresh_token(user_id, token_hash, expires_at);
        self.db_context.execute(query).await?;

        Ok((raw_token, expires_at))
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn validate_and_rotate(
        &self,
        raw_token: &str,
    ) -> anyhow::Result<(uuid::Uuid, String, time::OffsetDateTime)> {
        let token_hash = Self::hash_token(raw_token);

        let query = user_queries::get_refresh_token_by_hash(token_hash);
        let stored = self
            .db_context
            .fetch_optional::<RefreshTokenModel>(query)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Invalid refresh token"))?;

        // Check expiry
        if stored.expires_at < time::OffsetDateTime::now_utc() {
            // Delete the expired token
            let del_query = user_queries::delete_refresh_token_by_id(stored.id);
            self.db_context.execute(del_query).await?;
            return Err(anyhow::anyhow!("Refresh token expired"));
        }

        // Rotate: delete old, create new
        let del_query = user_queries::delete_refresh_token_by_id(stored.id);
        self.db_context.execute(del_query).await?;

        let (new_raw_token, new_expires_at) = self.create_refresh_token(stored.user_id).await?;

        Ok((stored.user_id, new_raw_token, new_expires_at))
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn revoke_all_refresh_tokens(&self, user_id: uuid::Uuid) -> anyhow::Result<()> {
        let query = user_queries::delete_all_refresh_tokens_for_user(user_id);
        self.db_context.execute(query).await?;
        Ok(())
    }

    #[tracing::instrument(skip_all, err)]
    pub async fn issue_access_token(&self, user_id: uuid::Uuid) -> anyhow::Result<String> {
        let user = self.user_service.get_full_user(user_id).await?;
        let my_claims = ClaimsDto {
            sub: user.id,
            exp: jsonwebtoken::get_current_timestamp() + 900,
            role: user.role.role,
            username: user.username,
        };
        let token = encode(&Header::default(), &my_claims, &self.jwt_keys.encoding)?;
        Ok(token)
    }
}

// ===== CLERK FEATURE =====
#[cfg(feature = "clerk")]
use std::collections::HashMap;
#[cfg(feature = "clerk")]
use std::sync::Arc;
#[cfg(feature = "clerk")]
use std::time::{Duration, Instant};
#[cfg(feature = "clerk")]
use tokio::sync::RwLock;
#[cfg(feature = "clerk")]
use uuid::Uuid;

#[cfg(feature = "clerk")]
struct CachedJwks {
    keys: serde_json::Value,
    fetched_at: Instant,
}

#[cfg(feature = "clerk")]
pub struct AuthService {
    db_context: MyraDb,
    user_service: UsersService,
    clerk_secret_key: String,
    jwks_cache: Arc<RwLock<Option<CachedJwks>>>,
    /// Cache of clerk_user_id → (internal_user_id, username, fetched_at)
    identity_cache: Arc<RwLock<HashMap<String, (Uuid, String, Instant)>>>,
}

#[cfg(feature = "clerk")]
impl AuthService {
    pub fn new(db: MyraDb) -> Self {
        let clerk_secret_key = std::env::var("CLERK_SECRET_KEY")
            .expect("CLERK_SECRET_KEY must be set when using clerk auth feature");
        std::env::var("CLERK_PUBLISHABLE_KEY")
            .expect("CLERK_PUBLISHABLE_KEY must be set when using clerk auth feature");
        Self {
            db_context: db.clone(),
            user_service: UsersService::new(db),
            clerk_secret_key,
            jwks_cache: Arc::new(RwLock::new(None)),
            identity_cache: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Fetch JWKS from cache or Clerk API (TTL: 5 minutes).
    async fn get_jwks(&self) -> anyhow::Result<serde_json::Value> {
        {
            let cache = self.jwks_cache.read().await;
            if let Some(cached) = cache.as_ref() {
                if cached.fetched_at.elapsed() < Duration::from_secs(300) {
                    return Ok(cached.keys.clone());
                }
            }
        }

        let keys = self.fetch_jwks_from_clerk().await?;
        *self.jwks_cache.write().await = Some(CachedJwks {
            keys: keys.clone(),
            fetched_at: Instant::now(),
        });
        Ok(keys)
    }

    /// Fetch JWKS directly from Clerk's API.
    async fn fetch_jwks_from_clerk(&self) -> anyhow::Result<serde_json::Value> {
        let client = reqwest::Client::new();
        let jwks_response = client
            .get("https://api.clerk.com/v1/jwks")
            .header("Authorization", format!("Bearer {}", self.clerk_secret_key))
            .send()
            .await
            .map_err(|e| anyhow::anyhow!("Failed to fetch Clerk JWKS: {}", e))?;

        if !jwks_response.status().is_success() {
            return Err(anyhow::anyhow!(
                "Failed to fetch Clerk JWKS: endpoint returned status {}",
                jwks_response.status()
            ));
        }

        jwks_response
            .json()
            .await
            .map_err(|e| anyhow::anyhow!("Failed to parse Clerk JWKS: {}", e))
    }

    /// Resolve a Clerk user ID to an internal (UUID, username) pair, using in-memory cache.
    /// On cache miss, queries the DB; on DB miss, auto-provisions a new user.
    async fn resolve_internal_user(&self, clerk_user_id: &str) -> anyhow::Result<(Uuid, String)> {
        {
            let cache = self.identity_cache.read().await;
            if let Some((uuid, username, fetched_at)) = cache.get(clerk_user_id) {
                if fetched_at.elapsed() < Duration::from_secs(600) {
                    return Ok((*uuid, username.clone()));
                }
            }
        }

        use crate::dtos::add_user_dto::AddUserDto;
        use dal::models::external_identity_models::ExternalIdentityModel;
        use dal::queries::user_queries;

        let query = user_queries::get_user_by_external_id(
            "clerk".to_string(),
            clerk_user_id.to_string(),
        );
        let existing_user = self
            .db_context
            .fetch_optional::<ExternalIdentityModel>(query)
            .await?;

        let result = match existing_user {
            Some(user) => (user.user_id, user.username),
            None => {
                let new_user = self
                    .user_service
                    .register_user(AddUserDto {
                        username: clerk_user_id.to_string(),
                        password: None,
                        default_asset: 1,
                        assign_default_role: false,
                    })
                    .await?;

                let mapping_query = user_queries::insert_external_identity_mapping(
                    "clerk".to_string(),
                    clerk_user_id.to_string(),
                    new_user.id,
                );
                self.db_context.execute(mapping_query).await?;

                (new_user.id, new_user.username)
            }
        };

        const MAX_IDENTITY_CACHE_SIZE: usize = 10_000;

        let mut cache = self.identity_cache.write().await;
        if cache.len() >= MAX_IDENTITY_CACHE_SIZE {
            cache.retain(|_, (_, _, fetched_at)| fetched_at.elapsed() < Duration::from_secs(600));
        }
        cache.insert(
            clerk_user_id.to_string(),
            (result.0, result.1.clone(), Instant::now()),
        );
        Ok(result)
    }

    /// Verifies a Clerk JWT by fetching Clerk's JWKS (cached) and validating the token.
    /// Returns ClaimsDto with the internal user_id (resolved via external_identity_mappings, cached).
    /// On first login, auto-provisions an internal user record.
    #[tracing::instrument(skip_all, err)]
    pub async fn verify_clerk_token(&self, token: String) -> anyhow::Result<ClaimsDto> {
        use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};

        // 1. Get JWKS (from cache or Clerk API)
        let jwks = self.get_jwks().await?;

        // 2. Extract the matching RSA key from JWKS by kid
        let keys = jwks["keys"]
            .as_array()
            .ok_or_else(|| anyhow::anyhow!("Invalid JWKS format"))?;

        let header = jsonwebtoken::decode_header(&token)
            .map_err(|e| anyhow::anyhow!("Failed to decode JWT header: {}", e))?;

        let key = if let Some(kid) = &header.kid {
            keys.iter()
                .find(|k| k["kid"].as_str() == Some(kid))
                .ok_or_else(|| anyhow::anyhow!("No matching key found for kid: {}", kid))?
        } else {
            keys.first()
                .ok_or_else(|| anyhow::anyhow!("No keys in JWKS"))?
        };

        let decoding_key = DecodingKey::from_rsa_components(
            key["n"]
                .as_str()
                .ok_or_else(|| anyhow::anyhow!("Missing 'n' in JWK"))?,
            key["e"]
                .as_str()
                .ok_or_else(|| anyhow::anyhow!("Missing 'e' in JWK"))?,
        )
        .map_err(|e| anyhow::anyhow!("Failed to create decoding key: {}", e))?;

        // 3. Validate the JWT
        let mut validation = Validation::new(Algorithm::RS256);
        validation.validate_exp = true;
        // Clerk tokens use the Clerk instance URL as audience which varies per environment;
        // audience is implicitly trusted because we validate the signature against Clerk's JWKS.
        validation.validate_aud = false;

        let token_data = decode::<serde_json::Value>(&token, &decoding_key, &validation)
            .map_err(|e| anyhow::anyhow!("Failed to validate Clerk token: {}", e))?;

        let claims = token_data.claims;

        // 4. Extract clerk_user_id from "sub" claim
        let clerk_user_id = claims["sub"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("Missing 'sub' claim in Clerk token"))?
            .to_string();

        // 5. Extract admin status from public_metadata.role
        let role = claims
            .get("public_metadata")
            .and_then(|m| m.get("role"))
            .and_then(|r| r.as_str())
            .unwrap_or("User");
        let user_role = UserRoleEnumDto::from_str(role).unwrap_or(UserRoleEnumDto::User);

        // 6. Resolve internal user (from cache or DB, with auto-provisioning)
        let (internal_user_id, username) = self.resolve_internal_user(&clerk_user_id).await?;

        Ok(ClaimsDto {
            sub: internal_user_id,
            exp: claims["exp"].as_u64().unwrap_or(0),
            role: user_role,
            username,
        })
    }
}

#[cfg(feature = "noauth")]
pub struct AuthService {
    _db_context: MyraDb,
}

#[cfg(feature = "noauth")]
impl AuthService {
    pub fn new(db: MyraDb) -> Self {
        tracing::warn!("⚠️  SECURITY WARNING: Authentication is DISABLED. All requests will be accepted without authentication. Do NOT use this in production!");
        Self { _db_context: db }
    }
}
