use sea_query::Iden;

pub enum UsersIden {
    Table,
    Id,
    Username,
    PasswordHash,
    DefaultAssset,
    UserRole,
}

pub enum UserRolesIden {
    Table,
    Id,
    RoleName,
}

impl Iden for UsersIden {
    fn unquoted(&self, s: &mut dyn std::fmt::Write) {
        write!(
            s,
            "{}",
            match self {
                Self::Table => "users",
                Self::Id => "id",
                Self::Username => "username",
                Self::PasswordHash => "password_hash",
                Self::DefaultAssset => "default_asset",
                Self::UserRole => "user_role",
            }
        )
        .unwrap();
    }
}

impl Iden for UserRolesIden {
    fn unquoted(&self, s: &mut dyn std::fmt::Write) {
        write!(
            s,
            "{}",
            match self {
                Self::Table => "user_roles",
                Self::Id => "id",
                Self::RoleName => "role_name",
            }
        )
        .unwrap();
    }
}
