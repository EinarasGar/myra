#[uniffi::export]
pub fn format_money(amount: f64, ticker: String, signed: bool) -> String {
    let sign = if amount < 0.0 {
        "-"
    } else if signed {
        "+"
    } else {
        ""
    };
    let number = group_thousands(amount.abs());
    match currency_symbol(&ticker) {
        Some(symbol) => format!("{sign}{symbol}{number}"),
        None if ticker.is_empty() => format!("{sign}{number}"),
        None => format!("{sign}{number} {ticker}"),
    }
}

fn currency_symbol(ticker: &str) -> Option<&'static str> {
    match ticker.to_ascii_uppercase().as_str() {
        "USD" => Some("$"),
        "EUR" => Some("€"),
        "GBP" => Some("£"),
        "JPY" => Some("¥"),
        "INR" => Some("₹"),
        "KRW" => Some("₩"),
        "ILS" => Some("₪"),
        "THB" => Some("฿"),
        "PHP" => Some("₱"),
        "VND" => Some("₫"),
        "TRY" => Some("₺"),
        "NGN" => Some("₦"),
        "RUB" => Some("₽"),
        "UAH" => Some("₴"),
        "BRL" => Some("R$"),
        _ => None,
    }
}

fn group_thousands(value: f64) -> String {
    let formatted = format!("{value:.2}");
    let (int_part, frac_part) = formatted
        .split_once('.')
        .unwrap_or((formatted.as_str(), "00"));
    let bytes = int_part.as_bytes();
    let mut grouped = String::with_capacity(int_part.len() + int_part.len() / 3);
    for (i, b) in bytes.iter().enumerate() {
        if i > 0 && (bytes.len() - i) % 3 == 0 {
            grouped.push(',');
        }
        grouped.push(*b as char);
    }
    format!("{grouped}.{frac_part}")
}

#[cfg(test)]
mod tests {
    use super::format_money;

    #[test]
    fn negative_native_symbol() {
        assert_eq!(format_money(-15.34, "GBP".into(), false), "-£15.34");
    }

    #[test]
    fn positive_no_sign_when_unsigned() {
        assert_eq!(format_money(100.0, "EUR".into(), false), "€100.00");
    }

    #[test]
    fn thousands_grouping() {
        assert_eq!(format_money(46890.69, "USD".into(), false), "$46,890.69");
        assert_eq!(
            format_money(1000000.0, "USD".into(), false),
            "$1,000,000.00"
        );
    }

    #[test]
    fn signed_shows_explicit_plus() {
        assert_eq!(format_money(1500.0, "GBP".into(), true), "+£1,500.00");
        assert_eq!(format_money(-1500.0, "GBP".into(), true), "-£1,500.00");
    }

    #[test]
    fn unmapped_currency_falls_back_to_ticker_suffix() {
        assert_eq!(format_money(1234.56, "SEK".into(), false), "1,234.56 SEK");
    }

    #[test]
    fn ambiguous_symbol_falls_back_to_ticker() {
        assert_eq!(format_money(1234.56, "CAD".into(), false), "1,234.56 CAD");
        assert_eq!(format_money(1234.56, "CNY".into(), false), "1,234.56 CNY");
    }

    #[test]
    fn empty_ticker_renders_number_only() {
        assert_eq!(format_money(0.0, "".into(), false), "0.00");
    }

    #[test]
    fn one_decimal_value_pads_to_two() {
        assert_eq!(format_money(1234.5, "EUR".into(), false), "€1,234.50");
    }

    #[test]
    fn negative_wins_over_signed() {
        assert_eq!(format_money(-1000.0, "USD".into(), true), "-$1,000.00");
    }
}
