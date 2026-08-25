use std::collections::HashMap;

use rust_decimal::Decimal;
use time::OffsetDateTime;
use uuid::Uuid;

#[derive(Clone, Debug)]
pub struct Lot {
    pub units: Decimal,
    pub cost: Decimal,
    pub cost_currency: String,
    pub date: OffsetDateTime,
    pub label: String,
}

#[derive(Default)]
pub struct LotTracker {
    positions: HashMap<(Uuid, i32), Vec<Lot>>,
}

impl LotTracker {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn push(&mut self, account: Uuid, asset: i32, lot: Lot) {
        self.positions
            .entry((account, asset))
            .or_default()
            .push(lot);
    }

    pub fn pop_fifo(&mut self, account: Uuid, asset: i32, mut units: Decimal) -> Vec<Lot> {
        let mut taken = Vec::new();
        let Some(lots) = self.positions.get_mut(&(account, asset)) else {
            return taken;
        };

        while units > Decimal::ZERO && !lots.is_empty() {
            let lot = &mut lots[0];
            if lot.units <= units {
                units -= lot.units;
                taken.push(lots.remove(0));
            } else {
                let fraction_cost = lot.cost * units / lot.units;
                let piece = Lot {
                    units,
                    cost: fraction_cost,
                    cost_currency: lot.cost_currency.clone(),
                    date: lot.date,
                    label: lot.label.clone(),
                };
                lot.units -= units;
                lot.cost -= fraction_cost;
                taken.push(piece);
                units = Decimal::ZERO;
            }
        }

        taken
    }
}
