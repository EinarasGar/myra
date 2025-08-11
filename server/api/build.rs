use utoipa_config::Config;

fn main() {
    Config::new()
        .alias_for("AccountViewModel", "crate::view_models::accounts::base_models::account::Account<crate::view_models::accounts::base_models::account_type_id::AccountTypeId>")
        .alias_for("IdentifiableAccountViewModel", "crate::view_models::accounts::base_models::account::IdentifiableAccount<crate::view_models::accounts::base_models::account::Account<crate::view_models::accounts::base_models::account_type_id::AccountTypeId>>")
        .alias_for("ExpandedAccountViewModel", "crate::view_models::accounts::base_models::account::Account<crate::view_models::accounts::base_models::account_type::IdentifiableAccountTypeViewModel>")
        .alias_for("AssetViewModel", "crate::view_models::assets::base_models::asset::Asset<crate::view_models::assets::base_models::asset_type_id::RequiredAssetTypeId>")
        .alias_for("ExpandedAssetViewModel", "crate::view_models::assets::base_models::asset::Asset<crate::view_models::assets::base_models::asset_type::IdentifiableAssetTypeViewModel>")
        .alias_for("IdentifiableAssetViewModel", "crate::view_models::assets::base_models::asset::IdentifiableAsset<crate::view_models::assets::base_models::asset::Asset<crate::view_models::assets::base_models::asset_type_id::RequiredAssetTypeId>>")
        
        // Transaction Groups
        .alias_for("TransactionGroupViewModel", "crate::view_models::transactions::base_models::transaction_group::TransactionGroup<crate::view_models::transactions::transaction_types::TransactionWithEntries>")
        .alias_for("TransactionGroupWithIdentifiableChildrenViewModel", "crate::view_models::transactions::base_models::transaction_group::TransactionGroup<crate::view_models::transactions::transaction_types::IdentifiableTransactionWithIdentifiableEntries>")
        .alias_for("RequiredTransactionGroupViewModel", "crate::view_models::transactions::base_models::transaction_group::TransactionGroup<crate::view_models::transactions::transaction_types::RequiredIdentifiableTransactionWithIdentifiableEntries>")
        .alias_for("RequiredIdentifiableTransactionGroupViewModel", "crate::view_models::transactions::base_models::transaction_group::IdentifiableTransactionGroup<crate::view_models::transactions::base_models::transaction_group_id::TransactionGroupId, crate::view_models::transactions::base_models::transaction_group::TransactionGroup<crate::view_models::transactions::transaction_types::RequiredIdentifiableTransactionWithIdentifiableEntries>>")

        .write_to_file();
}
