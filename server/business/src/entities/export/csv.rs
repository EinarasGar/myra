use std::collections::HashMap;

use time::{OffsetDateTime, UtcOffset};

use super::{ExportAccount, ExportAsset, ExportTransaction, ExportTransactionType, LedgerExport};

const HEADER: [&str; 20] = [
    "transaction_id",
    "transaction_type",
    "date",
    "description",
    "group_id",
    "group_description",
    "group_category_type",
    "group_category",
    "group_date",
    "account_id",
    "account",
    "asset_id",
    "asset_ticker",
    "asset_name",
    "asset_type",
    "quantity",
    "category_type",
    "category",
    "is_fee",
    "dividend_source_asset",
];

pub fn render_csv(export: &LedgerExport) -> String {
    let accounts: HashMap<_, &ExportAccount> = export.accounts.iter().map(|a| (a.id, a)).collect();
    let assets: HashMap<_, &ExportAsset> = export.assets.iter().map(|a| (a.id, a)).collect();

    let mut txs: Vec<&ExportTransaction> = export.transactions.iter().collect();
    txs.sort_by(|a, b| a.date.cmp(&b.date).then(a.id.cmp(&b.id)));

    let mut wtr = csv::WriterBuilder::new()
        .terminator(csv::Terminator::Any(b'\n'))
        .from_writer(Vec::new());

    wtr.write_record(HEADER).expect("csv header");

    for tx in txs {
        let type_str = tx.tx_type.as_snake();
        let date_str = fmt_rfc3339(tx.date);
        let description = match tx.tx_type {
            ExportTransactionType::Regular => tx.description.clone().unwrap_or_default(),
            _ => String::new(),
        };
        let (group_id, group_desc, group_cat_type, group_cat, group_date) = match &tx.group {
            Some(g) => (
                g.id.to_string(),
                g.description.clone(),
                g.category_type.clone(),
                g.category.clone(),
                fmt_rfc3339(g.date),
            ),
            None => Default::default(),
        };
        let dividend_source = match tx.tx_type {
            ExportTransactionType::CashDividend => {
                tx.dividend_source_asset_ticker.clone().unwrap_or_default()
            }
            _ => String::new(),
        };

        for entry in tx.main_entries.iter().chain(tx.fee_entries.iter()) {
            let account = accounts.get(&entry.account_id);
            let asset = assets.get(&entry.asset_id);
            let record = [
                tx.id.to_string(),
                type_str.to_string(),
                date_str.clone(),
                description.clone(),
                group_id.clone(),
                group_desc.clone(),
                group_cat_type.clone(),
                group_cat.clone(),
                group_date.clone(),
                entry.account_id.to_string(),
                account.map(|a| a.name.clone()).unwrap_or_default(),
                entry.asset_id.to_string(),
                asset.map(|a| a.ticker.clone()).unwrap_or_default(),
                asset.map(|a| a.name.clone()).unwrap_or_default(),
                asset.map(|a| a.asset_type_name.clone()).unwrap_or_default(),
                entry.quantity.to_string(),
                entry.category_type.clone(),
                entry.category.clone(),
                entry.is_fee.to_string(),
                dividend_source.clone(),
            ];
            wtr.write_record(record).expect("csv row");
        }
    }

    let bytes = wtr.into_inner().expect("csv flush");
    String::from_utf8(bytes).expect("csv utf8")
}

fn fmt_rfc3339(dt: OffsetDateTime) -> String {
    let u = dt.to_offset(UtcOffset::UTC);
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        u.year(),
        u8::from(u.month()),
        u.day(),
        u.hour(),
        u.minute(),
        u.second()
    )
}
