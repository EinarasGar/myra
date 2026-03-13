use sea_query::Iden;

pub enum UsersIden {
    Table,
    Id,
    Username,
    DefaultAsset,
}

pub enum UserRolesIden {
    Table,
    Id,
    RoleName,
}

pub enum UserCredentialsIden {
    Table,
    UserId,
    PasswordHash,
}

pub enum UserRoleAssignmentsIden {
    Table,
    UserId,
    RoleId,
}

#[allow(dead_code)]
pub enum RefreshTokensIden {
    Table,
    Id,
    UserId,
    TokenHash,
    ExpiresAt,
    CreatedAt,
}

#[allow(dead_code)]
pub enum ExternalIdentityMappingsIden {
    Table,
    Id,
    Provider,
    ExternalUserId,
    UserId,
    CreatedAt,
}

impl Iden for UsersIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "users",
            Self::Id => "id",
            Self::Username => "username",
            Self::DefaultAsset => "default_asset",
        }
    }
}

impl Iden for UserRolesIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "user_roles",
            Self::Id => "id",
            Self::RoleName => "role_name",
        }
    }
}

impl Iden for UserCredentialsIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "user_credentials",
            Self::UserId => "user_id",
            Self::PasswordHash => "password_hash",
        }
    }
}

impl Iden for UserRoleAssignmentsIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "user_role_assignments",
            Self::UserId => "user_id",
            Self::RoleId => "role_id",
        }
    }
}

impl Iden for RefreshTokensIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "refresh_tokens",
            Self::Id => "id",
            Self::UserId => "user_id",
            Self::TokenHash => "token_hash",
            Self::ExpiresAt => "expires_at",
            Self::CreatedAt => "created_at",
        }
    }
}

impl Iden for ExternalIdentityMappingsIden {
    fn unquoted(&self) -> &str {
        match self {
            Self::Table => "external_identity_mappings",
            Self::Id => "id",
            Self::Provider => "provider",
            Self::ExternalUserId => "external_user_id",
            Self::UserId => "user_id",
            Self::CreatedAt => "created_at",
        }
    }
}
