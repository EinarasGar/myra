use sea_query::Iden;

pub enum TransactionIden {
    Table,
    Id,
    UserId,
    GroupId,
    AssetId,
    AccountId,
    CategoryId,
    Quantity,
    Date,
}

#[allow(dead_code)]
pub enum TransactionCategoriesIden {
    Table,
    Id,
    Category,
    Icon,
}

#[allow(dead_code)]
pub enum TransactionDescriptionsIden {
    Table,
    TransactionId,
    Description,
}

#[allow(dead_code)]
pub enum TransactionGroupIden {
    Table,
    TransactionGroupId,
    CategoryId,
    Description,
    DateAdded,
}

impl Iden for TransactionIden {
    fn unquoted(&self, s: &mut dyn std::fmt::Write) {
        write!(
            s,
            "{}",
            match self {
                Self::Table => "transaction",
                Self::Id => "id",
                Self::UserId => "user_id",
                Self::GroupId => "group_id",
                Self::AssetId => "asset_id",
                Self::AccountId => "account_id",
                Self::CategoryId => "category_id",
                Self::Quantity => "quantity",
                Self::Date => "date",
            }
        )
        .unwrap();
    }
}

impl Iden for TransactionCategoriesIden {
    fn unquoted(&self, s: &mut dyn std::fmt::Write) {
        write!(
            s,
            "{}",
            match self {
                Self::Table => "transaction_categories",
                Self::Id => "id",
                Self::Category => "category",
                Self::Icon => "icon",
            }
        )
        .unwrap();
    }
}

impl Iden for TransactionDescriptionsIden {
    fn unquoted(&self, s: &mut dyn std::fmt::Write) {
        write!(
            s,
            "{}",
            match self {
                Self::Table => "transaction_descriptions",
                Self::TransactionId => "transaction_id",
                Self::Description => "description",
            }
        )
        .unwrap();
    }
}

impl Iden for TransactionGroupIden {
    fn unquoted(&self, s: &mut dyn std::fmt::Write) {
        write!(
            s,
            "{}",
            match self {
                Self::Table => "transaction_group",
                Self::CategoryId => "category_id",
                Self::TransactionGroupId => "transaction_group_id",
                Self::Description => "description",
                Self::DateAdded => "date_added",
            }
        )
        .unwrap();
    }
}
