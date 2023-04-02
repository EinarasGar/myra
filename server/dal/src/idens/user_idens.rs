use sea_query::Iden;

pub enum UsersIden {
    Table,
    Id,
    Username,
    Password,
    DefaultAssset,
    Role,
}

pub enum UserRolesIden {
    Table,
    Id,
    Name,
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
                Self::Password => "password",
                Self::DefaultAssset => "default_asset",
                Self::Role => "role",
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
                Self::Name => "name",
            }
        )
        .unwrap();
    }
}
