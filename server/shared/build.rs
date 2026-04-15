use utoipa_config::Config;

const ACCOUNT_ENTRY_MODULE: &str =
    "crate::view_models::transactions::base_models::account_asset_entry";
const TRANSACTION_BASE_MODULE: &str =
    "crate::view_models::transactions::base_models::transaction_base";
const TRANSACTION_FEE_MODULE: &str =
    "crate::view_models::transactions::base_models::transaction_fee";
const TRANSACTION_GROUP_MODULE: &str =
    "crate::view_models::transactions::base_models::transaction_group";
const ENTRY_ID_MODULE: &str = "crate::view_models::transactions::base_models::entry_id";
const TRANSACTION_ID_MODULE: &str = "crate::view_models::transactions::base_models::transaction_id";
const TRANSACTION_GROUP_ID_MODULE: &str =
    "crate::view_models::transactions::base_models::transaction_group_id";
const TRANSACTION_TYPES_MODULE: &str = "crate::view_models::transactions::transaction_types";
const VALUE_TYPES_MODULE: &str = "crate::view_models::transactions::value_types";

fn main() {
    let config = register_static_aliases(Config::new());
    let config = register_transaction_aliases(config);

    config.write_to_file();
}

fn register_static_aliases(mut config: Config<'static>) -> Config<'static> {
    for (alias_name, value) in [
        (
            "AccountViewModel",
            "crate::view_models::accounts::base_models::account::Account<crate::view_models::accounts::base_models::account_type_id::AccountTypeId>",
        ),
        (
            "ExpandedAccountViewModel",
            "crate::view_models::accounts::base_models::account::Account<crate::view_models::accounts::base_models::account_type::IdentifiableAccountTypeViewModel>",
        ),
        (
            "AccountWithId",
            "crate::view_models::accounts::base_models::account::IdentifiableAccount<crate::view_models::accounts::base_models::account::Account<crate::view_models::accounts::base_models::account_type_id::AccountTypeId>>",
        ),
        (
            "IdentifiableAccountViewModel",
            "crate::view_models::accounts::base_models::account::IdentifiableAccount<crate::view_models::accounts::base_models::account::Account<crate::view_models::accounts::base_models::account_type_id::AccountTypeId>>",
        ),
        (
            "AssetViewModel",
            "crate::view_models::assets::base_models::asset::Asset<crate::view_models::assets::base_models::asset_type_id::RequiredAssetTypeId>",
        ),
        (
            "AssetWithType",
            "crate::view_models::assets::base_models::asset::Asset<crate::view_models::assets::base_models::asset_type::IdentifiableAssetTypeViewModel>",
        ),
        (
            "ExpandedAssetViewModel",
            "crate::view_models::assets::base_models::asset::Asset<crate::view_models::assets::base_models::asset_type::IdentifiableAssetTypeViewModel>",
        ),
        (
            "AssetWithId",
            "crate::view_models::assets::base_models::asset::IdentifiableAsset<crate::view_models::assets::base_models::asset::Asset<crate::view_models::assets::base_models::asset_type_id::RequiredAssetTypeId>>",
        ),
        (
            "IdentifiableAssetViewModel",
            "crate::view_models::assets::base_models::asset::IdentifiableAsset<crate::view_models::assets::base_models::asset::Asset<crate::view_models::assets::base_models::asset_type_id::RequiredAssetTypeId>>",
        ),
        (
            "CategoryViewModel",
            "crate::view_models::categories::base_models::category::Category<crate::view_models::categories::base_models::category_type_id::RequiredCategoryTypeId>",
        ),
        (
            "CategoryWithType",
            "crate::view_models::categories::base_models::category::Category<crate::view_models::categories::base_models::category_type::IdentifiableCategoryTypeViewModel>",
        ),
        (
            "ExpandedCategoryViewModel",
            "crate::view_models::categories::base_models::category::Category<crate::view_models::categories::base_models::category_type::IdentifiableCategoryTypeViewModel>",
        ),
        (
            "CategoryWithId",
            "crate::view_models::categories::base_models::category::IdentifiableCategory<crate::view_models::categories::base_models::category_type_id::RequiredCategoryTypeId>",
        ),
        (
            "IdentifiableCategoryViewModel",
            "crate::view_models::categories::base_models::category::IdentifiableCategory<crate::view_models::categories::base_models::category_type_id::RequiredCategoryTypeId>",
        ),
        (
            "IdentifiableExpandedCategoryViewModel",
            "crate::view_models::categories::base_models::category::IdentifiableCategory<crate::view_models::categories::base_models::category_type::IdentifiableCategoryTypeViewModel>",
        ),
    ] {
        config = config.alias_for(alias_name, value);
    }

    let transaction_entry = transaction_entry("Amount");
    let transaction_entry_with_entry_id = identifiable_entry("EntryId");
    let transaction_entry_with_required_entry_id = identifiable_entry("RequiredEntryId");
    let transaction_fee_item = transaction_fee(&transaction_entry);
    let transaction_fee_item_with_entry_id = transaction_fee(&transaction_entry_with_entry_id);
    let transaction_fee_item_with_required_entry_id =
        transaction_fee(&transaction_entry_with_required_entry_id);
    let transaction_base_with_entries = transaction_base(&transaction_fee_item);
    let transaction_base_with_identifiable_entries =
        transaction_base(&transaction_fee_item_with_entry_id);
    let required_transaction_base_with_identifiable_entries =
        transaction_base(&transaction_fee_item_with_required_entry_id);
    let identifiable_transaction_base_with_identifiable_entries =
        identifiable_transaction_base(&transaction_base_with_identifiable_entries, "TransactionId");
    let required_identifiable_transaction_base_with_identifiable_entries =
        identifiable_transaction_base(
            &required_transaction_base_with_identifiable_entries,
            "RequiredTransactionId",
        );
    let transaction_input = format!("{TRANSACTION_TYPES_MODULE}::TransactionWithEntries");
    let transaction_with_id =
        format!("{TRANSACTION_TYPES_MODULE}::IdentifiableTransactionWithIdentifiableEntries");
    let required_transaction_with_id = format!(
        "{TRANSACTION_TYPES_MODULE}::RequiredIdentifiableTransactionWithIdentifiableEntries"
    );
    let transaction_group_input = transaction_group(&transaction_input);
    let transaction_group_with_entry_ids = transaction_group(&transaction_with_id);
    let required_transaction_group = transaction_group(&required_transaction_with_id);
    let transaction_group_with_id = identifiable_transaction_group(&required_transaction_group);

    for (alias_name, value) in [
        ("TransactionEntry", transaction_entry.as_str()),
        ("AccountAssetEntryViewModel", transaction_entry.as_str()),
        (
            "TransactionEntryWithEntryId",
            transaction_entry_with_entry_id.as_str(),
        ),
        (
            "IdentifiableAccountAssetEntryViewModel",
            transaction_entry_with_entry_id.as_str(),
        ),
        (
            "TransactionEntryWithRequiredEntryId",
            transaction_entry_with_required_entry_id.as_str(),
        ),
        (
            "RequiredIdentifiableAccountAssetEntryViewModel",
            transaction_entry_with_required_entry_id.as_str(),
        ),
        ("TransactionFeeItem", transaction_fee_item.as_str()),
        ("TransactionFeeViewModel", transaction_fee_item.as_str()),
        (
            "TransactionFeeItemWithEntryId",
            transaction_fee_item_with_entry_id.as_str(),
        ),
        (
            "IdentifiableTransactionFeeViewModel",
            transaction_fee_item_with_entry_id.as_str(),
        ),
        (
            "TransactionFeeItemWithRequiredEntryId",
            transaction_fee_item_with_required_entry_id.as_str(),
        ),
        (
            "RequiredIdentifiableTransactionFeeViewModel",
            transaction_fee_item_with_required_entry_id.as_str(),
        ),
        (
            "TransactionBaseWithEntries",
            transaction_base_with_entries.as_str(),
        ),
        (
            "TransactionBaseWithIdentifiableEntries",
            transaction_base_with_identifiable_entries.as_str(),
        ),
        (
            "RequiredTransactionBaseWithIdentifiableEntries",
            required_transaction_base_with_identifiable_entries.as_str(),
        ),
        (
            "IdentifiableTransactionBaseWithIdentifiableEntries",
            identifiable_transaction_base_with_identifiable_entries.as_str(),
        ),
        (
            "RequiredIdentifiableTransactionBaseWithIdentifiableEntries",
            required_identifiable_transaction_base_with_identifiable_entries.as_str(),
        ),
        ("TransactionInput", transaction_input.as_str()),
        ("TransactionWithId", transaction_with_id.as_str()),
        (
            "RequiredTransactionWithId",
            required_transaction_with_id.as_str(),
        ),
        ("TransactionGroupInput", transaction_group_input.as_str()),
        (
            "TransactionGroupWithEntryIds",
            transaction_group_with_entry_ids.as_str(),
        ),
        (
            "RequiredTransactionGroup",
            required_transaction_group.as_str(),
        ),
        ("TransactionGroupWithId", transaction_group_with_id.as_str()),
    ] {
        config = add_alias(config, alias_name, value);
    }

    config
}

fn register_transaction_aliases(mut config: Config<'static>) -> Config<'static> {
    for (name, module, view_amount) in [
        ("RegularTransaction", "regular_transaction", "NonZeroAmount"),
        ("CashTransferOut", "cash_transfer_out", "NegativeAmount"),
        ("CashTransferIn", "cash_transfer_in", "PositiveAmount"),
        ("CashDividend", "cash_dividend", "PositiveAmount"),
        ("AssetTransferOut", "asset_transfer_out", "NegativeAmount"),
        ("AssetTransferIn", "asset_transfer_in", "PositiveAmount"),
        ("AssetTrade", "asset_trade", "Amount"),
        ("AssetSale", "asset_sale", "Amount"),
        ("AssetPurchase", "asset_purchase", "Amount"),
        ("AssetDividend", "asset_dividend", "PositiveAmount"),
        ("AssetBalanceTransfer", "asset_balance_transfer", "Amount"),
        ("AccountFees", "account_fees", "NegativeAmount"),
    ] {
        config = register_transaction_alias_group(config, name, module, view_amount);
    }

    config
}

fn register_transaction_alias_group(
    mut config: Config<'static>,
    name: &'static str,
    module: &'static str,
    view_amount: &'static str,
) -> Config<'static> {
    let transaction_type = format!("{TRANSACTION_TYPES_MODULE}::{module}::{name}");
    let input_entry = transaction_entry("Amount");
    let view_entry = transaction_entry(view_amount);
    let identifiable_entry_type = identifiable_entry("EntryId");
    let required_entry_type = identifiable_entry("RequiredEntryId");
    let base_with_entries = transaction_base(&transaction_fee(&transaction_entry("Amount")));
    let base_with_identifiable_entries =
        transaction_base(&transaction_fee(&identifiable_entry_type));
    let required_base_with_identifiable_entries =
        transaction_base(&transaction_fee(&required_entry_type));
    let identifiable_base_with_identifiable_entries =
        identifiable_transaction_base(&base_with_identifiable_entries, "TransactionId");
    let required_identifiable_base_with_identifiable_entries = identifiable_transaction_base(
        &required_base_with_identifiable_entries,
        "RequiredTransactionId",
    );

    for (alias_name, value) in [
        (
            format!("{name}InputViewModel"),
            format!("{transaction_type}<{base_with_entries}, {input_entry}>"),
        ),
        (
            format!("{name}ViewModel"),
            format!("{transaction_type}<{base_with_entries}, {view_entry}>"),
        ),
        (
            format!("{name}WithIdentifiableEntriesViewModel"),
            format!(
                "{transaction_type}<{base_with_identifiable_entries}, {identifiable_entry_type}>"
            ),
        ),
        (
            format!("Required{name}WithIdentifiableEntriesViewModel"),
            format!(
                "{transaction_type}<{required_base_with_identifiable_entries}, {required_entry_type}>"
            ),
        ),
        (
            format!("Identifiable{name}WithIdentifiableEntriesViewModel"),
            format!(
                "{transaction_type}<{identifiable_base_with_identifiable_entries}, {identifiable_entry_type}>"
            ),
        ),
        (
            format!("RequiredIdentifiable{name}WithIdentifiableEntriesViewModel"),
            format!(
                "{transaction_type}<{required_identifiable_base_with_identifiable_entries}, {required_entry_type}>"
            ),
        ),
    ] {
        config = config.alias_for(leak(alias_name), leak(value));
    }

    config
}

fn add_alias(
    mut config: Config<'static>,
    alias_name: &'static str,
    value: &str,
) -> Config<'static> {
    config = config.alias_for(alias_name, leak(value.to_owned()));
    config
}

fn transaction_entry(amount: &str) -> String {
    format!("{ACCOUNT_ENTRY_MODULE}::AccountAssetEntry<{VALUE_TYPES_MODULE}::{amount}>")
}

fn identifiable_entry(id: &str) -> String {
    format!("{ACCOUNT_ENTRY_MODULE}::IdentifiableAccountAssetEntry<{ENTRY_ID_MODULE}::{id}>")
}

fn transaction_fee(entry: &str) -> String {
    format!("{TRANSACTION_FEE_MODULE}::TransactionFee<{entry}>")
}

fn transaction_base(fee: &str) -> String {
    format!("{TRANSACTION_BASE_MODULE}::TransactionBase<{fee}>")
}

fn identifiable_transaction_base(base: &str, id: &str) -> String {
    format!("{TRANSACTION_BASE_MODULE}::IdentifiableTransactionBase<{base}, {TRANSACTION_ID_MODULE}::{id}>")
}

fn transaction_group(transaction: &str) -> String {
    format!("{TRANSACTION_GROUP_MODULE}::TransactionGroup<{transaction}>")
}

fn identifiable_transaction_group(group: &str) -> String {
    format!("{TRANSACTION_GROUP_MODULE}::IdentifiableTransactionGroup<{TRANSACTION_GROUP_ID_MODULE}::TransactionGroupId, {group}>")
}

fn leak(value: String) -> &'static str {
    Box::leak(value.into_boxed_str())
}
