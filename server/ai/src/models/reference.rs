use serde::Serialize;

#[derive(Serialize)]
pub struct CategoryResult {
    pub id: i32,
    pub category: String,
    pub category_type: String,
    pub icon: Option<String>,
}

#[derive(Serialize)]
pub struct AssetResult {
    pub id: i32,
    pub asset_name: String,
    pub ticker: Option<String>,
    pub asset_type: String,
}
