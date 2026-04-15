use std::collections::HashMap;

use shared::view_models::{
    base_models::search::CombinedTransactionsPage,
    transactions::{
        base_models::metadata_lookup::MetadataLookupTables,
        get_transaction_group::GetTransactionGroupLineResponseViewModel,
        get_transactions::CombinedTransactionItemViewModel,
        transaction_types::{
            RequiredIdentifiableTransactionWithIdentifiableEntries as TxEnum,
            RequiredTransactionWithIdentifiableEntries as ReqTxEnum,
        },
    },
};

use crate::models::{TransactionListItem, TransactionsPage};

type Entry = shared::view_models::transactions::base_models::account_asset_entry::IdentifiableAccountAssetEntry<
    shared::view_models::transactions::base_models::entry_id::RequiredEntryId,
>;

pub fn extract_page(body: &str) -> Result<TransactionsPage, String> {
    let page: CombinedTransactionsPage = serde_json::from_str(body).map_err(|e| e.to_string())?;
    let tables = &page.lookup_tables;

    let items = page
        .results
        .iter()
        .map(|item| match item {
            CombinedTransactionItemViewModel::Individual(ind) => {
                to_list_item(&ind.transaction, tables)
            }
            CombinedTransactionItemViewModel::Group(grp) => group_to_list_item(&grp.group, tables),
        })
        .collect();

    Ok(TransactionsPage {
        items,
        has_more: page.has_more,
        next_cursor: page.next_cursor.map(|u| u.to_string()),
        total_results: page.total_results,
    })
}

pub(crate) fn to_list_item(tx: &TxEnum, tables: &MetadataLookupTables) -> TransactionListItem {
    let (id, date, tx_type, desc, cat_id, entries) = flatten(tx);
    build_list_item(id, date, tx_type, desc, cat_id, entries, tables)
}

/// Build a list item for the update-individual-transaction response, which returns the
/// variant without a top-level transaction_id (the caller already has it from the URL).
pub(crate) fn to_list_item_with_id(
    transaction_id: String,
    tx: &ReqTxEnum,
    tables: &MetadataLookupTables,
) -> TransactionListItem {
    let (date, tx_type, desc, cat_id, entries) = flatten_required(tx);
    build_list_item(transaction_id, date, tx_type, desc, cat_id, entries, tables)
}

fn build_list_item(
    id: String,
    date: i64,
    tx_type: &str,
    desc: Option<String>,
    cat_id: Option<i32>,
    entries: Vec<ET>,
    tables: &MetadataLookupTables,
) -> TransactionListItem {
    let first = entries.first();

    TransactionListItem {
        id,
        date,
        description: desc.unwrap_or_else(|| type_label(tx_type).to_string()),
        transaction_type: tx_type.to_string(),
        type_label: type_label(tx_type).to_string(),
        amount_display: format_entries(&entries, tables),
        account_name: first
            .and_then(|e| find_account(tables, &e.0))
            .unwrap_or_default(),
        asset_display: first
            .and_then(|e| find_asset_display(tables, e.1))
            .unwrap_or_default(),
        category_name: cat_id
            .and_then(|id| find_category(tables, id))
            .unwrap_or_default(),
        is_group: false,
        group_size: 1,
        children: vec![],
    }
}

type ET = (String, i32, f64, bool);

fn entry(e: &Entry, out: bool) -> ET {
    (
        e.entry.account_id.0.to_string(),
        e.entry.asset_id.0,
        e.entry.amount.0.to_string().parse().unwrap_or(0.0),
        out,
    )
}

fn flatten_required(tx: &ReqTxEnum) -> (i64, &str, Option<String>, Option<i32>, Vec<ET>) {
    macro_rules! base {
        ($t:expr, $type:expr, $entries:expr) => {
            ($t.base.date.unix_timestamp(), $type, None, None, $entries)
        };
    }

    match tx {
        ReqTxEnum::RegularTransaction(t) => (
            t.base.date.unix_timestamp(),
            "regular",
            t.description.as_ref().map(|d| d.as_str().to_string()),
            Some(t.category_id.0),
            vec![entry(&t.entry, false)],
        ),
        ReqTxEnum::CashTransferIn(t) => base!(t, "cash_transfer_in", vec![entry(&t.entry, false)]),
        ReqTxEnum::CashTransferOut(t) => base!(t, "cash_transfer_out", vec![entry(&t.entry, true)]),
        ReqTxEnum::CashDividend(t) => base!(t, "cash_dividend", vec![entry(&t.entry, false)]),
        ReqTxEnum::AssetDividend(t) => base!(t, "asset_dividend", vec![entry(&t.entry, false)]),
        ReqTxEnum::AssetTransferIn(t) => {
            base!(t, "asset_transfer_in", vec![entry(&t.entry, false)])
        }
        ReqTxEnum::AssetTransferOut(t) => {
            base!(t, "asset_transfer_out", vec![entry(&t.entry, true)])
        }
        ReqTxEnum::AccountFees(t) => base!(t, "account_fees", vec![entry(&t.entry, true)]),
        ReqTxEnum::AssetPurchase(t) => base!(
            t,
            "asset_purchase",
            vec![
                entry(&t.cash_outgoings_change, true),
                entry(&t.purchase_change, false)
            ]
        ),
        ReqTxEnum::AssetSale(t) => base!(
            t,
            "asset_sale",
            vec![entry(&t.sale_entry, true), entry(&t.proceeds_entry, false)]
        ),
        ReqTxEnum::AssetTrade(t) => base!(
            t,
            "asset_trade",
            vec![
                entry(&t.outgoing_entry, true),
                entry(&t.incoming_entry, false)
            ]
        ),
        ReqTxEnum::AssetBalanceTransfer(t) => base!(
            t,
            "asset_balance_transfer",
            vec![
                entry(&t.outgoing_change, true),
                entry(&t.incoming_change, false)
            ]
        ),
    }
}

fn flatten(tx: &TxEnum) -> (String, i64, &str, Option<String>, Option<i32>, Vec<ET>) {
    macro_rules! base {
        ($t:expr, $type:expr, $entries:expr) => {
            (
                $t.base.transaction_id.0.to_string(),
                $t.base.base.date.unix_timestamp(),
                $type,
                None,
                None,
                $entries,
            )
        };
    }

    match tx {
        TxEnum::RegularTransaction(t) => (
            t.base.transaction_id.0.to_string(),
            t.base.base.date.unix_timestamp(),
            "regular",
            t.description.as_ref().map(|d| d.as_str().to_string()),
            Some(t.category_id.0),
            vec![entry(&t.entry, false)],
        ),
        TxEnum::CashTransferIn(t) => base!(t, "cash_transfer_in", vec![entry(&t.entry, false)]),
        TxEnum::CashTransferOut(t) => base!(t, "cash_transfer_out", vec![entry(&t.entry, true)]),
        TxEnum::CashDividend(t) => base!(t, "cash_dividend", vec![entry(&t.entry, false)]),
        TxEnum::AssetDividend(t) => base!(t, "asset_dividend", vec![entry(&t.entry, false)]),
        TxEnum::AssetTransferIn(t) => base!(t, "asset_transfer_in", vec![entry(&t.entry, false)]),
        TxEnum::AssetTransferOut(t) => base!(t, "asset_transfer_out", vec![entry(&t.entry, true)]),
        TxEnum::AccountFees(t) => base!(t, "account_fees", vec![entry(&t.entry, true)]),
        TxEnum::AssetPurchase(t) => base!(
            t,
            "asset_purchase",
            vec![
                entry(&t.cash_outgoings_change, true),
                entry(&t.purchase_change, false)
            ]
        ),
        TxEnum::AssetSale(t) => base!(
            t,
            "asset_sale",
            vec![entry(&t.sale_entry, true), entry(&t.proceeds_entry, false)]
        ),
        TxEnum::AssetTrade(t) => base!(
            t,
            "asset_trade",
            vec![
                entry(&t.outgoing_entry, true),
                entry(&t.incoming_entry, false)
            ]
        ),
        TxEnum::AssetBalanceTransfer(t) => base!(
            t,
            "asset_balance_transfer",
            vec![
                entry(&t.outgoing_change, true),
                entry(&t.incoming_change, false)
            ]
        ),
    }
}

fn group_to_list_item(
    grp: &GetTransactionGroupLineResponseViewModel,
    tables: &MetadataLookupTables,
) -> TransactionListItem {
    let tg = &grp.transaction_group;
    let group_size = tg.group.transactions.len() as u32;

    let mut totals: HashMap<String, f64> = HashMap::new();
    for child in &tg.group.transactions {
        for (_, asset_id, amount, outgoing) in &flatten(child).5 {
            let signed = if *outgoing {
                -amount.abs()
            } else {
                amount.abs()
            };
            *totals.entry(find_ticker(tables, *asset_id)).or_default() += signed;
        }
    }

    let mut sorted: Vec<_> = totals.into_iter().collect();
    sorted.sort_by(|a, b| {
        b.1.abs()
            .partial_cmp(&a.1.abs())
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    let amount_display = match sorted.len() {
        0 => String::new(),
        1 | 2 => sorted
            .iter()
            .map(|(t, a)| fmt(*a, t))
            .collect::<Vec<_>>()
            .join(", "),
        _ => format!(
            "{} +{} more",
            sorted
                .iter()
                .take(2)
                .map(|(t, a)| fmt(*a, t))
                .collect::<Vec<_>>()
                .join(", "),
            sorted.len() - 2
        ),
    };

    TransactionListItem {
        id: tg.group_id.0.to_string(),
        date: tg.group.date.unix_timestamp(),
        description: tg.group.description.as_str().to_string(),
        transaction_type: "group".to_string(),
        type_label: format!("Group · {group_size}"),
        amount_display,
        account_name: tg
            .group
            .transactions
            .iter()
            .find_map(|c| {
                flatten(c)
                    .5
                    .first()
                    .and_then(|e| find_account(tables, &e.0))
            })
            .unwrap_or_default(),
        asset_display: String::new(),
        category_name: find_category(tables, tg.group.category_id.0).unwrap_or_default(),
        is_group: true,
        group_size,
        children: tg
            .group
            .transactions
            .iter()
            .map(|c| to_list_item(c, tables))
            .collect(),
    }
}

pub(crate) fn find_account(t: &MetadataLookupTables, id: &str) -> Option<String> {
    t.accounts
        .iter()
        .find(|a| a.account_id.0.to_string() == id)
        .map(|a| a.account.name.as_str().to_string())
}

pub(crate) fn find_asset_display(t: &MetadataLookupTables, id: i32) -> Option<String> {
    t.assets.iter().find(|a| a.asset_id.0 == id).map(|a| {
        let tk = a.asset.ticker.as_str();
        let nm = a.asset.name.as_str();
        if nm.is_empty() {
            tk.to_string()
        } else {
            format!("{tk} — {nm}")
        }
    })
}

fn find_ticker(t: &MetadataLookupTables, id: i32) -> String {
    t.assets
        .iter()
        .find(|a| a.asset_id.0 == id)
        .map(|a| a.asset.ticker.as_str().to_string())
        .unwrap_or_else(|| "?".into())
}

pub(crate) fn find_category(t: &MetadataLookupTables, id: i32) -> Option<String> {
    t.categories
        .iter()
        .find(|c| c.id.0 == id)
        .map(|c| c.category.category.as_str().to_string())
}

fn format_entries(entries: &[ET], tables: &MetadataLookupTables) -> String {
    match entries.len() {
        0 => String::new(),
        1 => fmt(entries[0].2, &find_ticker(tables, entries[0].1)),
        _ => format!(
            "{} → {}",
            fmt(entries[0].2, &find_ticker(tables, entries[0].1)),
            fmt(entries[1].2, &find_ticker(tables, entries[1].1))
        ),
    }
}

fn type_label(t: &str) -> &str {
    match t {
        "asset_purchase" => "Asset Buy",
        "asset_sale" => "Asset Sell",
        "cash_transfer_in" => "Cash In",
        "cash_transfer_out" => "Cash Out",
        "cash_dividend" | "asset_dividend" => "Dividend",
        "asset_trade" => "Trade",
        "asset_transfer_in" => "Transfer In",
        "asset_transfer_out" => "Transfer Out",
        "asset_balance_transfer" => "Balance Transfer",
        "account_fees" => "Fees",
        "regular" => "Transaction",
        other => other,
    }
}

fn fmt(amount: f64, ticker: &str) -> String {
    format!("{} {ticker}", (amount * 100.0).round() / 100.0)
}
