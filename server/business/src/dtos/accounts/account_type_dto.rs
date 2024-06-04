use dal::models::account_model::AccountTypeModel;

pub struct AccountTypeDto {
    pub id: i32,
    pub name: String,
}

impl From<AccountTypeModel> for AccountTypeDto {
    fn from(model: AccountTypeModel) -> Self {
        Self {
            id: model.id,
            name: model.account_type_name,
        }
    }
}
