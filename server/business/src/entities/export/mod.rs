use std::collections::HashMap;

use dal::enums::transaction_types::DatabaseTransactionTypes;
use rust_decimal::Decimal;
use time::OffsetDateTime;
use uuid::Uuid;

pub mod beancount;
pub mod csv;

#[derive(Clone, Debug)]
pub struct LedgerExport {
    pub accounts: Vec<ExportAccount>,
    pub assets: Vec<ExportAsset>,
    pub transactions: Vec<ExportTransaction>,
    pub cost_rates: HashMap<(i32, OffsetDateTime), Decimal>,
    pub custom_asset_manual_rates: Vec<CustomAssetManualRate>,
    pub default_currency_ticker: String,
    rate_inputs: Vec<(i32, OffsetDateTime)>,
    base_pairs: HashMap<i32, i32>,
    custom_asset_rate_pairs: Vec<(i32, i32)>,
}

#[derive(Clone, Debug)]
pub struct ExportAccount {
    pub id: Uuid,
    pub name: String,
    pub account_type_name: String,
}

#[derive(Clone, Debug)]
pub struct ExportAsset {
    pub id: i32,
    pub ticker: String,
    pub name: String,
    pub asset_type_name: String,
    pub base_pair_quote_ticker: Option<String>,
    pub is_custom: bool,
}

#[derive(Clone, Debug)]
pub struct ExportTransaction {
    pub id: Uuid,
    pub date: OffsetDateTime,
    pub tx_type: ExportTransactionType,
    pub description: Option<String>,
    pub group: Option<ExportGroup>,
    pub main_entries: Vec<ExportEntry>,
    pub fee_entries: Vec<ExportEntry>,
    pub dividend_source_asset_ticker: Option<String>,
}

#[derive(Clone, Debug)]
pub struct ExportGroup {
    pub id: Uuid,
    pub description: String,
    pub category_type: String,
    pub category: String,
    pub date: OffsetDateTime,
}

#[derive(Clone, Debug)]
pub struct ExportEntry {
    pub account_id: Uuid,
    pub asset_id: i32,
    pub quantity: Decimal,
    pub category_type: String,
    pub category: String,
    pub is_fee: bool,
}

#[derive(Clone, Debug)]
pub struct CustomAssetManualRate {
    pub asset_id: i32,
    pub date: OffsetDateTime,
    pub price: Decimal,
}

#[derive(Clone, Debug)]
pub enum ExportTransactionType {
    Regular,
    CashTransferIn,
    CashTransferOut,
    CashBalanceTransfer,
    CashDividend,
    AssetTransferIn,
    AssetTransferOut,
    AssetTrade,
    AssetSale,
    AssetPurchase,
    AssetDividend,
    AssetBalanceTransfer,
    AccountFees,
}

impl ExportTransactionType {
    pub fn as_snake(&self) -> &'static str {
        match self {
            ExportTransactionType::Regular => "regular",
            ExportTransactionType::CashTransferIn => "cash_transfer_in",
            ExportTransactionType::CashTransferOut => "cash_transfer_out",
            ExportTransactionType::CashBalanceTransfer => "cash_balance_transfer",
            ExportTransactionType::CashDividend => "cash_dividend",
            ExportTransactionType::AssetTransferIn => "asset_transfer_in",
            ExportTransactionType::AssetTransferOut => "asset_transfer_out",
            ExportTransactionType::AssetTrade => "asset_trade",
            ExportTransactionType::AssetSale => "asset_sale",
            ExportTransactionType::AssetPurchase => "asset_purchase",
            ExportTransactionType::AssetDividend => "asset_dividend",
            ExportTransactionType::AssetBalanceTransfer => "asset_balance_transfer",
            ExportTransactionType::AccountFees => "account_fees",
        }
    }
}

impl LedgerExport {
    pub fn render_csv(&self) -> String {
        crate::entities::export::csv::render_csv(self)
    }

    pub fn render_beancount(&self) -> String {
        crate::entities::export::beancount::render::render_beancount(self)
    }

    pub fn from_rows(
        rows: Vec<dal::models::transaction_models::LedgerExportRow>,
        default_asset_id: Option<i32>,
    ) -> Self {
        let mut account_map: HashMap<Uuid, ExportAccount> = HashMap::new();
        let mut asset_map: HashMap<i32, ExportAsset> = HashMap::new();
        let mut ticker_by_id: HashMap<i32, String> = HashMap::new();
        let mut type_by_id: HashMap<i32, String> = HashMap::new();
        let mut base_pairs: HashMap<i32, i32> = HashMap::new();

        for row in &rows {
            account_map
                .entry(row.entry_account_id)
                .or_insert_with(|| ExportAccount {
                    id: row.entry_account_id,
                    name: row.account_name.clone().unwrap_or_default(),
                    account_type_name: row.account_type_name.clone().unwrap_or_default(),
                });

            asset_map
                .entry(row.entry_asset_id)
                .or_insert_with(|| ExportAsset {
                    id: row.entry_asset_id,
                    ticker: row.asset_ticker.clone().unwrap_or_default(),
                    name: row.asset_name.clone().unwrap_or_default(),
                    asset_type_name: row.asset_type_name.clone().unwrap_or_default(),
                    base_pair_quote_ticker: row.base_pair_ticker.clone(),
                    is_custom: row.asset_user_id.is_some(),
                });

            ticker_by_id
                .entry(row.entry_asset_id)
                .or_insert_with(|| row.asset_ticker.clone().unwrap_or_default());
            type_by_id
                .entry(row.entry_asset_id)
                .or_insert_with(|| row.asset_type_name.clone().unwrap_or_default());
            if let Some(bp) = row.asset_base_pair_id {
                base_pairs.entry(row.entry_asset_id).or_insert(bp);
            }
        }

        let accounts: Vec<ExportAccount> = account_map.into_values().collect();
        let assets: Vec<ExportAsset> = asset_map.into_values().collect();

        let default_currency_ticker = default_asset_id
            .and_then(|id| ticker_by_id.get(&id).cloned())
            .unwrap_or_default();

        let (transactions, rate_inputs) = build_transactions(rows, &type_by_id);

        let custom_asset_rate_pairs: Vec<(i32, i32)> = assets
            .iter()
            .filter(|a| a.is_custom)
            .filter_map(|a| base_pairs.get(&a.id).map(|bp| (a.id, *bp)))
            .collect();

        Self {
            accounts,
            assets,
            transactions,
            cost_rates: HashMap::new(),
            custom_asset_manual_rates: Vec::new(),
            default_currency_ticker,
            rate_inputs,
            base_pairs,
            custom_asset_rate_pairs,
        }
    }

    pub fn rate_inputs(&self) -> &[(i32, OffsetDateTime)] {
        &self.rate_inputs
    }

    pub fn base_pairs(&self) -> &HashMap<i32, i32> {
        &self.base_pairs
    }

    pub fn custom_asset_rate_pairs(&self) -> &[(i32, i32)] {
        &self.custom_asset_rate_pairs
    }

    pub fn set_cost_rates(&mut self, rates: HashMap<(i32, OffsetDateTime), Decimal>) {
        self.cost_rates = rates;
    }

    pub fn set_custom_asset_manual_rates(&mut self, rates: Vec<CustomAssetManualRate>) {
        self.custom_asset_manual_rates = rates;
    }
}

fn build_transactions(
    rows: Vec<dal::models::transaction_models::LedgerExportRow>,
    type_by_id: &HashMap<i32, String>,
) -> (Vec<ExportTransaction>, Vec<(i32, OffsetDateTime)>) {
    let mut ticker_by_id: HashMap<i32, String> = HashMap::new();
    for row in &rows {
        if let Some(ticker) = &row.asset_ticker {
            ticker_by_id
                .entry(row.entry_asset_id)
                .or_insert(ticker.clone());
        }
    }

    let mut order: Vec<Uuid> = Vec::new();
    let mut grouped: HashMap<Uuid, Vec<dal::models::transaction_models::LedgerExportRow>> =
        HashMap::new();
    for row in rows {
        let id = row.transaction_id;
        if !grouped.contains_key(&id) {
            order.push(id);
        }
        grouped.entry(id).or_default().push(row);
    }

    let mut transactions = Vec::new();
    let mut rate_inputs = Vec::new();

    for id in order {
        let Some(entries) = grouped.remove(&id) else {
            continue;
        };
        let Some(first) = entries.first() else {
            continue;
        };
        let tx_type = map_transaction_type(first.type_id);
        let date = first.date_transacted;

        let mut main_entries = Vec::new();
        let mut fee_entries = Vec::new();
        for row in &entries {
            let category_type = row.category_type_name.clone().unwrap_or_default();
            let category = row.category_name.clone().unwrap_or_default();
            let is_fee = category_type.eq_ignore_ascii_case("fees")
                || crate::entities::categories::fee_categories::is_fee_category(
                    row.entry_category_id,
                );
            let entry = ExportEntry {
                account_id: row.entry_account_id,
                asset_id: row.entry_asset_id,
                quantity: row.entry_quantity,
                category_type,
                category,
                is_fee,
            };
            if is_fee {
                fee_entries.push(entry);
            } else {
                main_entries.push(entry);
            }
        }

        if matches!(
            tx_type,
            ExportTransactionType::AssetTransferIn
                | ExportTransactionType::AssetDividend
                | ExportTransactionType::AssetTrade
        ) {
            if let Some(asset_id) = relevant_asset_for_rate(&tx_type, &main_entries, type_by_id) {
                rate_inputs.push((asset_id, date));
            }
        }

        let description = first.description.clone();
        let dividend_source_asset_ticker = first
            .dividend_source_asset_id
            .and_then(|asset_id| ticker_by_id.get(&asset_id).cloned());

        let group = first.group_id.map(|gid| ExportGroup {
            id: gid,
            description: first.group_description.clone().unwrap_or_default(),
            category_type: first.group_category_type_name.clone().unwrap_or_default(),
            category: first.group_category_name.clone().unwrap_or_default(),
            date,
        });

        transactions.push(ExportTransaction {
            id,
            date,
            tx_type,
            description,
            group,
            main_entries,
            fee_entries,
            dividend_source_asset_ticker,
        });
    }

    (transactions, rate_inputs)
}

fn relevant_asset_for_rate(
    tx_type: &ExportTransactionType,
    main_entries: &[ExportEntry],
    type_by_id: &HashMap<i32, String>,
) -> Option<i32> {
    let is_currency = |asset_id: i32| -> bool {
        type_by_id
            .get(&asset_id)
            .map(|t| t.is_currency_type_name())
            .unwrap_or(false)
    };
    match tx_type {
        ExportTransactionType::AssetTrade => main_entries
            .iter()
            .find(|e| !is_currency(e.asset_id) && e.quantity < rust_decimal::Decimal::ZERO)
            .map(|e| e.asset_id),
        _ => main_entries
            .iter()
            .find(|e| !is_currency(e.asset_id))
            .map(|e| e.asset_id),
    }
}

fn map_transaction_type(type_id: DatabaseTransactionTypes) -> ExportTransactionType {
    match type_id {
        DatabaseTransactionTypes::RegularTransaction => ExportTransactionType::Regular,
        DatabaseTransactionTypes::CashTransferOut => ExportTransactionType::CashTransferOut,
        DatabaseTransactionTypes::CashTransferIn => ExportTransactionType::CashTransferIn,
        DatabaseTransactionTypes::CashDividend => ExportTransactionType::CashDividend,
        DatabaseTransactionTypes::AssetTransferOut => ExportTransactionType::AssetTransferOut,
        DatabaseTransactionTypes::AssetTransferIn => ExportTransactionType::AssetTransferIn,
        DatabaseTransactionTypes::AssetTrade => ExportTransactionType::AssetTrade,
        DatabaseTransactionTypes::AssetSale => ExportTransactionType::AssetSale,
        DatabaseTransactionTypes::AssetPurchase => ExportTransactionType::AssetPurchase,
        DatabaseTransactionTypes::AssetDividend => ExportTransactionType::AssetDividend,
        DatabaseTransactionTypes::AssetBalanceTransfer => {
            ExportTransactionType::AssetBalanceTransfer
        }
        DatabaseTransactionTypes::AccountFees => ExportTransactionType::AccountFees,
        DatabaseTransactionTypes::CashBalanceTransfer => ExportTransactionType::CashBalanceTransfer,
    }
}

#[cfg(test)]
mod tests {
    use std::process::Command;

    use rust_decimal::Decimal;
    use time::{Date, Month, OffsetDateTime};
    use uuid::Uuid;

    use super::*;

    fn dt(day: u8) -> OffsetDateTime {
        Date::from_calendar_date(2026, Month::August, day)
            .unwrap()
            .with_hms(0, 0, 0)
            .unwrap()
            .assume_utc()
    }

    fn dec(v: i64) -> Decimal {
        Decimal::new(v, 0)
    }

    fn uuid(n: u128) -> Uuid {
        Uuid::from_u128(n)
    }

    fn eur() -> ExportAsset {
        ExportAsset {
            id: 1,
            ticker: "EUR".to_string(),
            name: "Euro".to_string(),
            asset_type_name: "Currency".to_string(),
            base_pair_quote_ticker: None,
            is_custom: false,
        }
    }

    fn vwce() -> ExportAsset {
        ExportAsset {
            id: 42,
            ticker: "VWCE".to_string(),
            name: "Vanguard FTSE All-World".to_string(),
            asset_type_name: "ETF".to_string(),
            base_pair_quote_ticker: Some("EUR".to_string()),
            is_custom: false,
        }
    }

    fn broker() -> ExportAccount {
        ExportAccount {
            id: uuid(100),
            name: "Broker".to_string(),
            account_type_name: "Investment".to_string(),
        }
    }

    fn base(accounts: Vec<ExportAccount>, assets: Vec<ExportAsset>) -> LedgerExport {
        LedgerExport {
            accounts,
            assets,
            transactions: vec![],
            cost_rates: std::collections::HashMap::new(),
            custom_asset_manual_rates: vec![],
            default_currency_ticker: "EUR".to_string(),
            rate_inputs: vec![],
            base_pairs: std::collections::HashMap::new(),
            custom_asset_rate_pairs: vec![],
        }
    }

    fn entry(account: Uuid, asset: i32, qty: Decimal, is_fee: bool) -> ExportEntry {
        let (ct, c) = if is_fee {
            ("Fees".to_string(), "Transaction Fees".to_string())
        } else {
            ("Investments".to_string(), "Asset Purchase".to_string())
        };
        ExportEntry {
            account_id: account,
            asset_id: asset,
            quantity: qty,
            category_type: ct,
            category: c,
            is_fee,
        }
    }

    fn run_bean_check(ledger: &str) -> Option<bool> {
        let path = std::env::temp_dir().join(format!("sverto_{}.beancount", uuid(rand_seed())));
        std::fs::write(&path, ledger).ok()?;
        let result = Command::new("bean-check").arg(&path).output();
        let _ = std::fs::remove_file(&path);
        match result {
            Ok(out) => Some(out.status.success()),
            Err(_) => None,
        }
    }

    fn rand_seed() -> u128 {
        use std::time::{SystemTime, UNIX_EPOCH};
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0)
    }

    #[test]
    fn empty_ledger_csv_is_header_only() {
        let export = base(vec![], vec![]);
        let csv = export.render_csv();
        assert_eq!(
            csv,
            "transaction_id,transaction_type,date,description,group_id,group_description,group_category_type,group_category,group_date,account_id,account,asset_id,asset_ticker,asset_name,asset_type,quantity,category_type,category,is_fee,dividend_source_asset\n"
        );
    }

    #[test]
    fn empty_ledger_beancount_is_options_only() {
        let export = base(vec![], vec![]);
        let bc = export.render_beancount();
        assert_eq!(
            bc,
            "option \"title\" \"Sverto ledger\"\noption \"operating_currency\" \"EUR\"\noption \"booking_method\" \"FIFO\"\n"
        );
    }

    fn purchase_ledger() -> LedgerExport {
        let mut export = base(vec![broker()], vec![eur(), vwce()]);
        export.transactions.push(ExportTransaction {
            id: uuid(1),
            date: dt(20),
            tx_type: ExportTransactionType::AssetPurchase,
            description: None,
            group: None,
            main_entries: vec![
                entry(uuid(100), 42, dec(2), false),
                entry(uuid(100), 1, dec(-200), false),
            ],
            fee_entries: vec![entry(uuid(100), 1, dec(-1), true)],
            dividend_source_asset_ticker: None,
        });
        export
    }

    #[test]
    fn purchase_csv_rows() {
        let csv = purchase_ledger().render_csv();
        let lines: Vec<&str> = csv.lines().collect();
        assert_eq!(lines.len(), 4);
        assert!(lines[1].contains(",asset_purchase,2026-08-20T00:00:00Z,"));
        assert!(lines[1]
            .ends_with(",42,VWCE,Vanguard FTSE All-World,ETF,2,Investments,Asset Purchase,false,"));
        assert!(lines[2].ends_with(",1,EUR,Euro,Currency,-200,Investments,Asset Purchase,false,"));
        assert!(lines[3].ends_with(",1,EUR,Euro,Currency,-1,Fees,Transaction Fees,true,"));
    }

    #[test]
    fn purchase_beancount_postings() {
        let bc = purchase_ledger().render_beancount();
        assert!(bc.contains("2026-08-20 open Assets:Broker"));
        assert!(bc.contains("2026-08-20 commodity VWCE"));
        assert!(bc.contains("  name: \"Vanguard FTSE All-World\""));
        assert!(bc.contains("  sverto-type: \"asset_purchase\""));
        assert!(bc.contains(&format!(
            "  Assets:Broker  2 VWCE {{{{200 EUR, \"{}\"}}}}",
            uuid(1)
        )));
        assert!(bc.contains("  Assets:Broker  -200 EUR"));
        assert!(bc.contains("  Expenses:Fees:Transaction-Fees  1 EUR"));
    }

    #[test]
    fn liability_account_uses_liabilities_root() {
        let mut credit = broker();
        credit.name = "Credit Card".to_string();
        credit.account_type_name = "Credit".to_string();
        let mut export = base(vec![credit], vec![eur()]);
        export.transactions.push(ExportTransaction {
            id: uuid(2),
            date: dt(21),
            tx_type: ExportTransactionType::Regular,
            description: Some("Groceries".to_string()),
            group: None,
            main_entries: vec![ExportEntry {
                account_id: uuid(100),
                asset_id: 1,
                quantity: dec(-50),
                category_type: "Living".to_string(),
                category: "Groceries".to_string(),
                is_fee: false,
            }],
            fee_entries: vec![],
            dividend_source_asset_ticker: None,
        });
        let bc = export.render_beancount();
        assert!(bc.contains("open Liabilities:Credit-Card"));
        assert!(bc.contains("  Liabilities:Credit-Card  -50 EUR"));
        assert!(bc.contains("  Expenses:Living:Groceries  50 EUR"));
    }

    #[test]
    fn transfer_in_missing_rate_falls_back_to_zero_cost() {
        let mut export = base(vec![broker()], vec![eur(), vwce()]);
        export.transactions.push(ExportTransaction {
            id: uuid(3),
            date: dt(22),
            tx_type: ExportTransactionType::AssetTransferIn,
            description: None,
            group: None,
            main_entries: vec![entry(uuid(100), 42, dec(5), false)],
            fee_entries: vec![],
            dividend_source_asset_ticker: None,
        });
        let bc = export.render_beancount();
        assert!(bc.contains("  sverto-note: \"no market rate on date\""));
        assert!(bc.contains(&format!(
            "  Assets:Broker  5 VWCE {{{{0 EUR, \"{}\"}}}}",
            uuid(3)
        )));
        assert!(bc.contains("  Equity:External  0 EUR"));
    }

    #[test]
    fn balance_transfer_moves_labeled_lots() {
        let mut broker_a = broker();
        broker_a.name = "Broker A".to_string();
        let mut broker_b = broker();
        broker_b.id = uuid(101);
        broker_b.name = "Broker B".to_string();
        let mut export = base(vec![broker_a, broker_b], vec![eur(), vwce()]);
        export.transactions.push(ExportTransaction {
            id: uuid(10),
            date: dt(20),
            tx_type: ExportTransactionType::AssetPurchase,
            description: None,
            group: None,
            main_entries: vec![
                entry(uuid(100), 42, dec(3), false),
                entry(uuid(100), 1, dec(-300), false),
            ],
            fee_entries: vec![],
            dividend_source_asset_ticker: None,
        });
        export.transactions.push(ExportTransaction {
            id: uuid(11),
            date: dt(23),
            tx_type: ExportTransactionType::AssetBalanceTransfer,
            description: None,
            group: None,
            main_entries: vec![
                entry(uuid(100), 42, dec(-3), false),
                entry(uuid(101), 42, dec(3), false),
            ],
            fee_entries: vec![],
            dividend_source_asset_ticker: None,
        });
        let bc = export.render_beancount();
        assert!(bc.contains(&format!("  Assets:Broker-A  -3 VWCE {{\"{}\"}}", uuid(10))));
        assert!(bc.contains(&format!(
            "  Assets:Broker-B  3 VWCE {{{{300 EUR, 2026-08-20, \"{}\"}}}}",
            uuid(10)
        )));
    }

    #[test]
    fn bean_check_accepts_generated_ledger() {
        let bc = purchase_ledger().render_beancount();
        match run_bean_check(&bc) {
            Some(ok) => assert!(ok, "bean-check rejected generated ledger:\n{}", bc),
            None => eprintln!("skipping bean-check assertion: bean-check not on PATH"),
        }
    }
}

pub(crate) trait CurrencyTypeName {
    fn is_currency_type_name(&self) -> bool;
}

impl CurrencyTypeName for String {
    fn is_currency_type_name(&self) -> bool {
        let t = self.trim();
        t.eq_ignore_ascii_case("currency") || t.eq_ignore_ascii_case("currencies")
    }
}

impl CurrencyTypeName for str {
    fn is_currency_type_name(&self) -> bool {
        let t = self.trim();
        t.eq_ignore_ascii_case("currency") || t.eq_ignore_ascii_case("currencies")
    }
}
