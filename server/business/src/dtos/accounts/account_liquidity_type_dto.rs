use dal::models::account_models::AccountLiquidityTypeModel;

#[derive(Clone)]
pub struct AccountLiquidityTypeDto {
    pub id: i32,
    pub name: String,
}

impl From<AccountLiquidityTypeModel> for AccountLiquidityTypeDto {
    fn from(model: AccountLiquidityTypeModel) -> Self {
        Self {
            id: model.id,
            name: model.liquidity_type_name,
        }
    }
}
