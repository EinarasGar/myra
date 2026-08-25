use std::collections::HashMap;

use rust_decimal::Decimal;
use time::{Date, OffsetDateTime, UtcOffset};
use uuid::Uuid;

use super::lots::{Lot, LotTracker};
use super::naming::{sanitize_component, ticker_component, Naming};
use crate::entities::export::{
    CurrencyTypeName, ExportAsset, ExportTransaction, ExportTransactionType, LedgerExport,
};

const NO_RATE_NOTE: &str = "no market rate on date";

pub fn render_beancount(export: &LedgerExport) -> String {
    let naming = Naming::build(export);
    let assets: HashMap<i32, &ExportAsset> = export.assets.iter().map(|a| (a.id, a)).collect();
    let assets_by_ticker: HashMap<String, &ExportAsset> = export
        .assets
        .iter()
        .map(|a| (a.ticker.to_uppercase(), a))
        .collect();

    let mut txs: Vec<&ExportTransaction> = export.transactions.iter().collect();
    txs.sort_by(|a, b| a.date.cmp(&b.date).then(a.id.cmp(&b.id)));

    let mut tracker = LotTracker::new();
    let mut account_first: HashMap<String, Date> = HashMap::new();
    let mut commodity_first: HashMap<String, (Date, String)> = HashMap::new();
    let mut blocks: Vec<(OffsetDateTime, Uuid, String)> = Vec::new();

    let is_currency = |asset_id: i32| -> bool {
        assets
            .get(&asset_id)
            .map(|a| a.asset_type_name.is_currency_type_name())
            .unwrap_or(false)
    };
    let commodity_meta = |asset_id: i32| -> String {
        assets
            .get(&asset_id)
            .map(|a| a.name.clone())
            .unwrap_or_default()
    };

    for tx in &txs {
        let day = utc_date(tx.date);
        let label = tx.id.to_string();
        let mut postings: Vec<String> = Vec::new();
        let mut note = false;

        let acct = |id: &Uuid| naming.account(id);

        let reg_acc = |account_first: &mut HashMap<String, Date>, name: &str| {
            account_first
                .entry(name.to_string())
                .and_modify(|d| {
                    if day < *d {
                        *d = day;
                    }
                })
                .or_insert(day);
        };
        let reg_com =
            |commodity_first: &mut HashMap<String, (Date, String)>, name: &str, meta: &str| {
                commodity_first
                    .entry(name.to_string())
                    .and_modify(|e| {
                        if day < e.0 {
                            e.0 = day;
                        }
                    })
                    .or_insert((day, meta.to_string()));
            };

        match tx.tx_type {
            ExportTransactionType::Regular => {
                for entry in &tx.main_entries {
                    let cur = naming.commodity(entry.asset_id);
                    let account = acct(&entry.account_id);
                    let counter_root = if entry.quantity < Decimal::ZERO {
                        "Expenses"
                    } else {
                        "Income"
                    };
                    let counter = format!(
                        "{}:{}:{}",
                        counter_root,
                        sanitize_component(&entry.category_type),
                        sanitize_component(&entry.category)
                    );
                    postings.push(posting(&account, &entry.quantity, &cur));
                    postings.push(posting(&counter, &neg(&entry.quantity), &cur));
                    reg_acc(&mut account_first, &account);
                    reg_acc(&mut account_first, &counter);
                    reg_com(&mut commodity_first, &cur, &commodity_meta(entry.asset_id));
                }
            }
            ExportTransactionType::CashTransferIn | ExportTransactionType::CashTransferOut => {
                for entry in &tx.main_entries {
                    let cur = naming.commodity(entry.asset_id);
                    let account = acct(&entry.account_id);
                    postings.push(posting(&account, &entry.quantity, &cur));
                    postings.push(posting("Equity:External", &neg(&entry.quantity), &cur));
                    reg_acc(&mut account_first, &account);
                    reg_acc(&mut account_first, "Equity:External");
                    reg_com(&mut commodity_first, &cur, &commodity_meta(entry.asset_id));
                }
            }
            ExportTransactionType::CashBalanceTransfer => {
                for entry in &tx.main_entries {
                    let cur = naming.commodity(entry.asset_id);
                    let account = acct(&entry.account_id);
                    postings.push(posting(&account, &entry.quantity, &cur));
                    reg_acc(&mut account_first, &account);
                    reg_com(&mut commodity_first, &cur, &commodity_meta(entry.asset_id));
                }
            }
            ExportTransactionType::AccountFees => {
                for entry in &tx.main_entries {
                    let cur = naming.commodity(entry.asset_id);
                    let account = acct(&entry.account_id);
                    postings.push(posting(&account, &entry.quantity, &cur));
                    postings.push(posting(
                        "Expenses:Fees:Account-Fees",
                        &neg(&entry.quantity),
                        &cur,
                    ));
                    reg_acc(&mut account_first, &account);
                    reg_acc(&mut account_first, "Expenses:Fees:Account-Fees");
                    reg_com(&mut commodity_first, &cur, &commodity_meta(entry.asset_id));
                }
            }
            ExportTransactionType::CashDividend => {
                let ticker = tx
                    .dividend_source_asset_ticker
                    .as_deref()
                    .map(ticker_component)
                    .unwrap_or_else(|| "Unknown".to_string());
                let income = format!("Income:Dividends:{}", ticker);
                for entry in &tx.main_entries {
                    let cur = naming.commodity(entry.asset_id);
                    let account = acct(&entry.account_id);
                    postings.push(posting(&account, &entry.quantity, &cur));
                    postings.push(posting(&income, &neg(&entry.quantity), &cur));
                    reg_acc(&mut account_first, &account);
                    reg_acc(&mut account_first, &income);
                    reg_com(&mut commodity_first, &cur, &commodity_meta(entry.asset_id));
                }
            }
            ExportTransactionType::AssetPurchase => {
                let asset_entry = tx.main_entries.iter().find(|e| !is_currency(e.asset_id));
                let cash_entry = tx.main_entries.iter().find(|e| is_currency(e.asset_id));
                if let (Some(ae), Some(ce)) = (asset_entry, cash_entry) {
                    let commodity = naming.commodity(ae.asset_id);
                    let cur = naming.commodity(ce.asset_id);
                    let account = acct(&ae.account_id);
                    let cost = -ce.quantity;
                    postings.push(cost_posting(
                        &account,
                        &ae.quantity,
                        &commodity,
                        &cost,
                        &cur,
                        &label,
                    ));
                    postings.push(posting(&acct(&ce.account_id), &ce.quantity, &cur));
                    push_rounding_if_needed(
                        &mut postings,
                        &mut account_first,
                        day,
                        &ae.quantity,
                        &cost,
                    );
                    tracker.push(
                        ae.account_id,
                        ae.asset_id,
                        Lot {
                            units: ae.quantity,
                            cost,
                            cost_currency: cur.clone(),
                            date: tx.date,
                            label: label.clone(),
                        },
                    );
                    reg_acc(&mut account_first, &account);
                    reg_com(
                        &mut commodity_first,
                        &commodity,
                        &commodity_meta(ae.asset_id),
                    );
                    reg_com(&mut commodity_first, &cur, &commodity_meta(ce.asset_id));
                }
            }
            ExportTransactionType::AssetSale => {
                let asset_entry = tx.main_entries.iter().find(|e| !is_currency(e.asset_id));
                let cash_entry = tx.main_entries.iter().find(|e| is_currency(e.asset_id));
                if let (Some(ae), Some(ce)) = (asset_entry, cash_entry) {
                    let commodity = naming.commodity(ae.asset_id);
                    let cur = naming.commodity(ce.asset_id);
                    let account = acct(&ae.account_id);
                    let proceeds = ce.quantity;
                    let gains = format!(
                        "Income:Gains:{}",
                        ticker_component(&asset_ticker(&assets, ae.asset_id))
                    );
                    postings.push(format!(
                        "  {}  {} {} {{}} @@ {} {}",
                        account, ae.quantity, commodity, proceeds, cur
                    ));
                    postings.push(posting(&acct(&ce.account_id), &ce.quantity, &cur));
                    postings.push(format!("  {}", gains));
                    tracker.pop_fifo(ae.account_id, ae.asset_id, -ae.quantity);
                    reg_acc(&mut account_first, &account);
                    reg_acc(&mut account_first, &gains);
                    reg_com(
                        &mut commodity_first,
                        &commodity,
                        &commodity_meta(ae.asset_id),
                    );
                    reg_com(&mut commodity_first, &cur, &commodity_meta(ce.asset_id));
                }
            }
            ExportTransactionType::AssetTrade => {
                let out_entry = tx.main_entries.iter().find(|e| {
                    if is_currency(e.asset_id) {
                        false
                    } else {
                        e.quantity < Decimal::ZERO
                    }
                });
                let in_entry = tx
                    .main_entries
                    .iter()
                    .find(|e| !is_currency(e.asset_id) && e.quantity > Decimal::ZERO);
                let _ = &out_entry;
                let trade_uses_cash_out = tx
                    .main_entries
                    .iter()
                    .any(|e| is_currency(e.asset_id) && e.quantity < Decimal::ZERO);
                if let (Some(oe), Some(ie)) = (out_entry, in_entry) {
                    let out_com = naming.commodity(oe.asset_id);
                    let in_com = naming.commodity(ie.asset_id);
                    let account = acct(&oe.account_id);
                    let units_out = -oe.quantity;
                    let consumed = tracker.pop_fifo(oe.account_id, oe.asset_id, units_out);
                    let consumed_cost: Decimal = consumed.iter().map(|l| l.cost).sum();
                    let cur = base_pair_currency(&assets, &assets_by_ticker, &naming, oe.asset_id)
                        .unwrap_or_else(|| export.default_currency_ticker.to_uppercase());
                    let rate = export.cost_rates.get(&(oe.asset_id, tx.date)).copied();
                    let (value, emit_gain) = match rate {
                        Some(r) => (units_out * r, true),
                        None => {
                            note = true;
                            (consumed_cost, false)
                        }
                    };
                    if trade_uses_cash_out {
                        postings.push(posting(&account, &oe.quantity, &out_com));
                    } else {
                        postings.push(format!(
                            "  {}  {} {} {{}}",
                            account,
                            fmt_amount(&oe.quantity),
                            out_com
                        ));
                    }
                    postings.push(cost_posting(
                        &acct(&ie.account_id),
                        &ie.quantity,
                        &in_com,
                        &value,
                        &cur,
                        &label,
                    ));
                    push_rounding_if_needed(
                        &mut postings,
                        &mut account_first,
                        day,
                        &ie.quantity,
                        &value,
                    );
                    if emit_gain {
                        let gains = format!(
                            "Income:Gains:{}",
                            ticker_component(&asset_ticker(&assets, oe.asset_id))
                        );
                        postings.push(format!("  {}", gains));
                        reg_acc(&mut account_first, &gains);
                    }
                    tracker.push(
                        ie.account_id,
                        ie.asset_id,
                        Lot {
                            units: ie.quantity,
                            cost: value,
                            cost_currency: cur.clone(),
                            date: tx.date,
                            label: label.clone(),
                        },
                    );
                    reg_acc(&mut account_first, &account);
                    reg_com(&mut commodity_first, &out_com, &commodity_meta(oe.asset_id));
                    reg_com(&mut commodity_first, &in_com, &commodity_meta(ie.asset_id));
                    reg_com(
                        &mut commodity_first,
                        &cur,
                        &currency_meta(&assets_by_ticker, &cur),
                    );
                }
            }
            ExportTransactionType::AssetTransferIn => {
                if let Some(ae) = tx.main_entries.iter().find(|e| !is_currency(e.asset_id)) {
                    let commodity = naming.commodity(ae.asset_id);
                    let account = acct(&ae.account_id);
                    let cur = base_pair_currency(&assets, &assets_by_ticker, &naming, ae.asset_id)
                        .unwrap_or_else(|| export.default_currency_ticker.to_uppercase());
                    let rate = export.cost_rates.get(&(ae.asset_id, tx.date)).copied();
                    let value = match rate {
                        Some(r) => ae.quantity * r,
                        None => {
                            note = true;
                            Decimal::ZERO
                        }
                    };
                    postings.push(cost_posting(
                        &account,
                        &ae.quantity,
                        &commodity,
                        &value,
                        &cur,
                        &label,
                    ));
                    postings.push(posting("Equity:External", &neg(&value), &cur));
                    push_rounding_if_needed(
                        &mut postings,
                        &mut account_first,
                        day,
                        &ae.quantity,
                        &value,
                    );
                    tracker.push(
                        ae.account_id,
                        ae.asset_id,
                        Lot {
                            units: ae.quantity,
                            cost: value,
                            cost_currency: cur.clone(),
                            date: tx.date,
                            label: label.clone(),
                        },
                    );
                    reg_acc(&mut account_first, &account);
                    reg_acc(&mut account_first, "Equity:External");
                    reg_com(
                        &mut commodity_first,
                        &commodity,
                        &commodity_meta(ae.asset_id),
                    );
                    reg_com(
                        &mut commodity_first,
                        &cur,
                        &currency_meta(&assets_by_ticker, &cur),
                    );
                }
            }
            ExportTransactionType::AssetDividend => {
                if let Some(ae) = tx.main_entries.iter().find(|e| !is_currency(e.asset_id)) {
                    let commodity = naming.commodity(ae.asset_id);
                    let account = acct(&ae.account_id);
                    let income = format!(
                        "Income:Dividends:{}",
                        ticker_component(&asset_ticker(&assets, ae.asset_id))
                    );
                    let cur = base_pair_currency(&assets, &assets_by_ticker, &naming, ae.asset_id)
                        .unwrap_or_else(|| export.default_currency_ticker.to_uppercase());
                    let rate = export.cost_rates.get(&(ae.asset_id, tx.date)).copied();
                    let value = match rate {
                        Some(r) => ae.quantity * r,
                        None => {
                            note = true;
                            Decimal::ZERO
                        }
                    };
                    postings.push(cost_posting(
                        &account,
                        &ae.quantity,
                        &commodity,
                        &value,
                        &cur,
                        &label,
                    ));
                    postings.push(posting(&income, &neg(&value), &cur));
                    push_rounding_if_needed(
                        &mut postings,
                        &mut account_first,
                        day,
                        &ae.quantity,
                        &value,
                    );
                    tracker.push(
                        ae.account_id,
                        ae.asset_id,
                        Lot {
                            units: ae.quantity,
                            cost: value,
                            cost_currency: cur.clone(),
                            date: tx.date,
                            label: label.clone(),
                        },
                    );
                    reg_acc(&mut account_first, &account);
                    reg_acc(&mut account_first, &income);
                    reg_com(
                        &mut commodity_first,
                        &commodity,
                        &commodity_meta(ae.asset_id),
                    );
                    reg_com(
                        &mut commodity_first,
                        &cur,
                        &currency_meta(&assets_by_ticker, &cur),
                    );
                }
            }
            ExportTransactionType::AssetTransferOut => {
                if let Some(ae) = tx.main_entries.iter().find(|e| !is_currency(e.asset_id)) {
                    let commodity = naming.commodity(ae.asset_id);
                    let account = acct(&ae.account_id);
                    let consumed = tracker.pop_fifo(ae.account_id, ae.asset_id, -ae.quantity);
                    let value: Decimal = consumed.iter().map(|l| l.cost).sum();
                    let cur = consumed
                        .first()
                        .map(|l| l.cost_currency.clone())
                        .unwrap_or_else(|| {
                            base_pair_currency(&assets, &assets_by_ticker, &naming, ae.asset_id)
                                .unwrap_or_else(|| export.default_currency_ticker.to_uppercase())
                        });
                    postings.push(format!(
                        "  {}  {} {} {{}}",
                        account,
                        fmt_amount(&ae.quantity),
                        commodity
                    ));
                    postings.push(posting("Equity:External", &value, &cur));
                    tracker.pop_fifo(ae.account_id, ae.asset_id, -ae.quantity);
                    reg_acc(&mut account_first, &account);
                    reg_acc(&mut account_first, "Equity:External");
                    reg_com(
                        &mut commodity_first,
                        &commodity,
                        &commodity_meta(ae.asset_id),
                    );
                }
            }
            ExportTransactionType::AssetBalanceTransfer => {
                let src = tx
                    .main_entries
                    .iter()
                    .find(|e| !is_currency(e.asset_id) && e.quantity < Decimal::ZERO);
                let dst = tx
                    .main_entries
                    .iter()
                    .find(|e| !is_currency(e.asset_id) && e.quantity > Decimal::ZERO);
                if let (Some(se), Some(de)) = (src, dst) {
                    let commodity = naming.commodity(se.asset_id);
                    let src_acct = acct(&se.account_id);
                    let dst_acct = acct(&de.account_id);
                    let moved = tracker.pop_fifo(se.account_id, se.asset_id, -se.quantity);
                    for lot in &moved {
                        postings.push(format!(
                            "  {}  {} {} {{\"{}\"}}",
                            src_acct, -lot.units, commodity, lot.label
                        ));
                        postings.push(format!(
                            "  {}  {} {} {{{{{} {}, {}, \"{}\"}}}}",
                            dst_acct,
                            fmt_amount(&lot.units),
                            commodity,
                            fmt_amount(&lot.cost),
                            lot.cost_currency,
                            utc_date_str(lot.date),
                            lot.label
                        ));
                        tracker.push(
                            de.account_id,
                            de.asset_id,
                            Lot {
                                units: lot.units,
                                cost: lot.cost,
                                cost_currency: lot.cost_currency.clone(),
                                date: lot.date,
                                label: lot.label.clone(),
                            },
                        );
                    }
                    reg_acc(&mut account_first, &src_acct);
                    reg_acc(&mut account_first, &dst_acct);
                    reg_com(
                        &mut commodity_first,
                        &commodity,
                        &commodity_meta(se.asset_id),
                    );
                }
            }
        }

        for fee in &tx.fee_entries {
            let cur = naming.commodity(fee.asset_id);
            let account = acct(&fee.account_id);
            let fees_account = format!("Expenses:Fees:{}", sanitize_component(&fee.category));
            postings.push(posting(&account, &fee.quantity, &cur));
            postings.push(posting(&fees_account, &neg(&fee.quantity), &cur));
            reg_acc(&mut account_first, &account);
            reg_acc(&mut account_first, &fees_account);
            reg_com(&mut commodity_first, &cur, &commodity_meta(fee.asset_id));
        }

        let narration = match tx.tx_type {
            ExportTransactionType::Regular => tx.description.clone().unwrap_or_default(),
            _ => tx
                .group
                .as_ref()
                .map(|g| g.description.clone())
                .unwrap_or_default(),
        };

        let mut block = String::new();
        block.push_str(&format!(
            "{} * \"{}\"\n",
            utc_date_str(tx.date),
            escape(&narration)
        ));
        block.push_str(&format!("  sverto-id: \"{}\"\n", tx.id));
        block.push_str(&format!("  sverto-type: \"{}\"\n", tx.tx_type.as_snake()));
        if let Some(g) = &tx.group {
            block.push_str(&format!("  sverto-group: \"{}\"\n", g.id));
        }
        if note {
            block.push_str(&format!("  sverto-note: \"{}\"\n", NO_RATE_NOTE));
        }
        for line in &postings {
            block.push_str(line);
            block.push('\n');
        }

        blocks.push((tx.date, tx.id, block));
    }

    for rate in &export.custom_asset_manual_rates {
        let Some(asset) = assets.get(&rate.asset_id) else {
            continue;
        };
        if !asset.is_custom {
            continue;
        }
        let commodity = naming.commodity(rate.asset_id);
        let day = utc_date(rate.date);
        commodity_first
            .entry(commodity.clone())
            .and_modify(|e| {
                if day < e.0 {
                    e.0 = day;
                }
            })
            .or_insert((day, asset.name.clone()));
        if let Some(cur) = &asset.base_pair_quote_ticker {
            let cur_name = cur.to_uppercase();
            commodity_first
                .entry(cur_name.clone())
                .and_modify(|e| {
                    if day < e.0 {
                        e.0 = day;
                    }
                })
                .or_insert((day, currency_meta(&assets_by_ticker, &cur_name)));
        }
    }

    assemble(
        export,
        &account_first,
        &commodity_first,
        &assets,
        &naming,
        &mut blocks,
    )
}

fn assemble(
    export: &LedgerExport,
    account_first: &HashMap<String, Date>,
    commodity_first: &HashMap<String, (Date, String)>,
    assets: &HashMap<i32, &ExportAsset>,
    naming: &Naming,
    blocks: &mut [(OffsetDateTime, Uuid, String)],
) -> String {
    let mut out = String::new();
    out.push_str("option \"title\" \"Sverto ledger\"\n");
    if !export.default_currency_ticker.is_empty() {
        out.push_str(&format!(
            "option \"operating_currency\" \"{}\"\n",
            export.default_currency_ticker
        ));
    }
    out.push_str("option \"booking_method\" \"FIFO\"\n");

    let mut commodities: Vec<(&String, &(Date, String))> = commodity_first.iter().collect();
    commodities.sort_by(|a, b| a.1 .0.cmp(&b.1 .0).then(a.0.cmp(b.0)));
    if !commodities.is_empty() {
        out.push('\n');
    }
    for (name, (date, meta)) in commodities {
        if name.trim().is_empty() {
            continue;
        }
        out.push_str(&format!("{} commodity {}\n", date_str(*date), name));
        out.push_str(&format!("  name: \"{}\"\n", escape(meta)));
    }

    let mut open_accounts: Vec<(&String, &Date)> = account_first.iter().collect();
    open_accounts.sort_by(|a, b| a.1.cmp(b.1).then(a.0.cmp(b.0)));
    if !open_accounts.is_empty() {
        out.push('\n');
    }
    for (name, date) in open_accounts {
        out.push_str(&format!("{} open {}\n", date_str(*date), name));
    }

    let mut prices: Vec<(Date, String, Decimal, String)> = Vec::new();
    for rate in &export.custom_asset_manual_rates {
        let Some(asset) = assets.get(&rate.asset_id) else {
            continue;
        };
        if !asset.is_custom {
            continue;
        }
        let Some(cur) = &asset.base_pair_quote_ticker else {
            continue;
        };
        prices.push((
            utc_date(rate.date),
            naming.commodity(rate.asset_id),
            rate.price,
            cur.to_uppercase(),
        ));
    }
    prices.sort_by(|a, b| a.0.cmp(&b.0).then(a.1.cmp(&b.1)));
    if !prices.is_empty() {
        out.push('\n');
    }
    for (date, commodity, price, cur) in prices {
        out.push_str(&format!(
            "{} price {} {} {}\n",
            date_str(date),
            commodity,
            fmt_amount(&price),
            cur
        ));
    }

    blocks.sort_by(|a, b| a.0.cmp(&b.0).then(a.1.cmp(&b.1)));
    for (_, _, block) in blocks.iter() {
        out.push('\n');
        out.push_str(block);
    }

    out
}

fn posting(account: &str, amount: &Decimal, currency: &str) -> String {
    format!("  {}  {} {}", account, fmt_amount(amount), currency)
}

fn push_rounding_if_needed(
    postings: &mut Vec<String>,
    account_first: &mut HashMap<String, Date>,
    day: Date,
    units: &Decimal,
    cost: &Decimal,
) {
    if units.is_zero() || cost.is_zero() {
        return;
    }
    let per_unit = *cost / *units;
    if per_unit.fract() != Decimal::ZERO {
        postings.push("  Equity:Rounding".to_string());
        account_first
            .entry("Equity:Rounding".to_string())
            .and_modify(|d| {
                if day < *d {
                    *d = day;
                }
            })
            .or_insert(day);
    }
}

fn fmt_amount(amount: &Decimal) -> String {
    let q = amount.round_dp(6);
    let normalized = q.normalize();
    let mut s = normalized.to_string();
    if s.contains('E') || s.contains('e') {
        s = q.to_string();
    }
    if s == "-0" || s == "-0.0" {
        s = "0".to_string();
    }
    s
}

fn neg(amount: &Decimal) -> Decimal {
    if amount.is_zero() {
        Decimal::ZERO
    } else {
        -*amount
    }
}

fn cost_posting(
    account: &str,
    units: &Decimal,
    commodity: &str,
    cost: &Decimal,
    currency: &str,
    label: &str,
) -> String {
    format!(
        "  {}  {} {} {{{{{} {}, \"{}\"}}}}",
        account,
        fmt_amount(units),
        commodity,
        fmt_amount(cost),
        currency,
        label
    )
}

fn asset_ticker(assets: &HashMap<i32, &ExportAsset>, asset_id: i32) -> String {
    assets
        .get(&asset_id)
        .map(|a| a.ticker.clone())
        .unwrap_or_default()
}

fn base_pair_currency(
    assets: &HashMap<i32, &ExportAsset>,
    assets_by_ticker: &HashMap<String, &ExportAsset>,
    naming: &Naming,
    asset_id: i32,
) -> Option<String> {
    let ticker = assets.get(&asset_id)?.base_pair_quote_ticker.clone()?;
    let upper = ticker.to_uppercase();
    Some(
        assets_by_ticker
            .get(&upper)
            .map(|a| naming.commodity(a.id))
            .unwrap_or(upper),
    )
}

fn currency_meta(assets_by_ticker: &HashMap<String, &ExportAsset>, currency: &str) -> String {
    assets_by_ticker
        .get(&currency.to_uppercase())
        .map(|a| a.name.clone())
        .unwrap_or_else(|| currency.to_string())
}

fn escape(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
}

fn utc_date(dt: OffsetDateTime) -> Date {
    dt.to_offset(UtcOffset::UTC).date()
}

fn utc_date_str(dt: OffsetDateTime) -> String {
    date_str(utc_date(dt))
}

fn date_str(d: Date) -> String {
    format!("{:04}-{:02}-{:02}", d.year(), u8::from(d.month()), d.day())
}

#[cfg(test)]
mod fmt_tests {
    use rust_decimal::Decimal;

    #[test]
    fn fmt_amount_rounds_to_6dp() {
        let v = "100.4991457572610632809621118".parse::<Decimal>().unwrap();
        assert_eq!(super::fmt_amount(&v), "100.499146");
        assert_eq!(super::fmt_amount(&Decimal::from(300)), "300");
        assert_eq!(super::fmt_amount(&Decimal::new(-232000, 3)), "-232");
    }
}
