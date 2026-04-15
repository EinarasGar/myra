use shared::view_models::transactions::{
    base_models::{
        account_asset_entry::RequiredIdentifiableAccountAssetEntryViewModel,
        metadata_lookup::MetadataLookupTables,
    },
    get_individual_transaction::GetIndividualTransactionViewModel,
    transaction_types::RequiredTransactionWithIdentifiableEntries as TxEnum,
};

use crate::{
    api::transactions::{find_account, find_asset_display, find_category},
    models::EditableTransaction,
};

type Entry = RequiredIdentifiableAccountAssetEntryViewModel;

pub fn extract_editable_transaction(body: &str) -> Result<EditableTransaction, String> {
    let response: GetIndividualTransactionViewModel =
        serde_json::from_str(body).map_err(|e| e.to_string())?;
    to_editable_transaction(&response.transaction, &response.lookup_tables)
}

pub(crate) fn to_editable_transaction(
    tx: &TxEnum,
    tables: &MetadataLookupTables,
) -> Result<EditableTransaction, String> {
    match tx {
        // Regular transactions allow either sign (income or expense), so the
        // amount must round-trip with its sign preserved — the form's
        // `AmountSign.ANY` won't re-apply a sign on submit.
        TxEnum::RegularTransaction(t) => Ok(EditableTransaction {
            type_key: "regular".into(),
            date: t.base.date.unix_timestamp(),
            description: t
                .description
                .as_ref()
                .map(|value| value.as_str().to_string())
                .unwrap_or_default(),
            category_id: Some(t.category_id.0),
            category_name: find_category(tables, t.category_id.0).unwrap_or_default(),
            origin_asset_id: None,
            origin_asset_display: String::new(),
            primary_entry_id: Some(t.entry.entry_id.0),
            primary_account_id: t.entry.entry.account_id.0.to_string(),
            primary_account_name: find_account(tables, &t.entry.entry.account_id.0.to_string())
                .unwrap_or_default(),
            primary_asset_id: t.entry.entry.asset_id.0,
            primary_asset_display: find_asset_display(tables, t.entry.entry.asset_id.0)
                .unwrap_or_default(),
            primary_amount: entry_amount_signed(&t.entry),
            secondary_entry_id: None,
            secondary_account_id: None,
            secondary_account_name: None,
            secondary_asset_id: None,
            secondary_asset_display: None,
            secondary_amount: None,
        }),
        TxEnum::AccountFees(t) => single_entry_transaction(
            "account_fees",
            t.base.date.unix_timestamp(),
            None,
            None,
            &t.entry,
            tables,
        ),
        TxEnum::CashTransferIn(t) => single_entry_transaction(
            "cash_transfer_in",
            t.base.date.unix_timestamp(),
            None,
            None,
            &t.entry,
            tables,
        ),
        TxEnum::CashTransferOut(t) => single_entry_transaction(
            "cash_transfer_out",
            t.base.date.unix_timestamp(),
            None,
            None,
            &t.entry,
            tables,
        ),
        TxEnum::AssetTransferIn(t) => single_entry_transaction(
            "asset_transfer_in",
            t.base.date.unix_timestamp(),
            None,
            None,
            &t.entry,
            tables,
        ),
        TxEnum::AssetTransferOut(t) => single_entry_transaction(
            "asset_transfer_out",
            t.base.date.unix_timestamp(),
            None,
            None,
            &t.entry,
            tables,
        ),
        TxEnum::CashDividend(t) => single_entry_transaction(
            "cash_dividend",
            t.base.date.unix_timestamp(),
            Some(t.origin_asset_id.0),
            Some(
                find_asset_display(tables, t.origin_asset_id.0)
                    .ok_or_else(|| format!("missing origin asset {}", t.origin_asset_id.0))?,
            ),
            &t.entry,
            tables,
        ),
        TxEnum::AssetDividend(t) => single_entry_transaction(
            "asset_dividend",
            t.base.date.unix_timestamp(),
            None,
            None,
            &t.entry,
            tables,
        ),
        TxEnum::AssetPurchase(t) => dual_entry_transaction(
            "asset_purchase",
            t.base.date.unix_timestamp(),
            &t.purchase_change,
            &t.cash_outgoings_change,
            tables,
        ),
        TxEnum::AssetSale(t) => dual_entry_transaction(
            "asset_sale",
            t.base.date.unix_timestamp(),
            &t.sale_entry,
            &t.proceeds_entry,
            tables,
        ),
        TxEnum::AssetTrade(t) => dual_entry_transaction(
            "asset_trade",
            t.base.date.unix_timestamp(),
            &t.outgoing_entry,
            &t.incoming_entry,
            tables,
        ),
        TxEnum::AssetBalanceTransfer(t) => dual_entry_transaction(
            "asset_balance_transfer",
            t.base.date.unix_timestamp(),
            &t.outgoing_change,
            &t.incoming_change,
            tables,
        ),
    }
}

// Typed transactions (POSITIVE/NEGATIVE) store a signed amount on the server
// but the form re-applies the configured sign on submit, so the input field
// must display the absolute value.
fn single_entry_transaction(
    type_key: &str,
    date: i64,
    origin_asset_id: Option<i32>,
    origin_asset_display: Option<String>,
    entry: &Entry,
    tables: &MetadataLookupTables,
) -> Result<EditableTransaction, String> {
    let primary_account_id = entry.entry.account_id.0.to_string();
    let primary_asset_id = entry.entry.asset_id.0;

    Ok(EditableTransaction {
        type_key: type_key.into(),
        date,
        description: String::new(),
        category_id: None,
        category_name: String::new(),
        origin_asset_id,
        origin_asset_display: origin_asset_display.unwrap_or_default(),
        primary_entry_id: Some(entry.entry_id.0),
        primary_account_id: primary_account_id.clone(),
        primary_account_name: find_account(tables, &primary_account_id).unwrap_or_default(),
        primary_asset_id,
        primary_asset_display: find_asset_display(tables, primary_asset_id).unwrap_or_default(),
        primary_amount: entry_amount_abs(entry),
        secondary_entry_id: None,
        secondary_account_id: None,
        secondary_account_name: None,
        secondary_asset_id: None,
        secondary_asset_display: None,
        secondary_amount: None,
    })
}

fn dual_entry_transaction(
    type_key: &str,
    date: i64,
    primary: &Entry,
    secondary: &Entry,
    tables: &MetadataLookupTables,
) -> Result<EditableTransaction, String> {
    let primary_account_id = primary.entry.account_id.0.to_string();
    let secondary_account_id = secondary.entry.account_id.0.to_string();
    let primary_asset_id = primary.entry.asset_id.0;
    let secondary_asset_id = secondary.entry.asset_id.0;

    Ok(EditableTransaction {
        type_key: type_key.into(),
        date,
        description: String::new(),
        category_id: None,
        category_name: String::new(),
        origin_asset_id: None,
        origin_asset_display: String::new(),
        primary_entry_id: Some(primary.entry_id.0),
        primary_account_id: primary_account_id.clone(),
        primary_account_name: find_account(tables, &primary_account_id).unwrap_or_default(),
        primary_asset_id,
        primary_asset_display: find_asset_display(tables, primary_asset_id).unwrap_or_default(),
        primary_amount: entry_amount_abs(primary),
        secondary_entry_id: Some(secondary.entry_id.0),
        secondary_account_id: Some(secondary_account_id.clone()),
        secondary_account_name: find_account(tables, &secondary_account_id),
        secondary_asset_id: Some(secondary_asset_id),
        secondary_asset_display: find_asset_display(tables, secondary_asset_id),
        secondary_amount: Some(entry_amount_abs(secondary)),
    })
}

fn entry_amount_signed(entry: &Entry) -> f64 {
    entry
        .entry
        .amount
        .0
        .to_string()
        .parse::<f64>()
        .unwrap_or(0.0)
}

fn entry_amount_abs(entry: &Entry) -> f64 {
    entry_amount_signed(entry).abs()
}
