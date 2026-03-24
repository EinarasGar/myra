INSERT INTO asset_types (id, asset_type_name)
VALUES (1, 'Currencies'),
    (2, 'Stocks'),
    (3, 'Bonds'),
    (4, 'Mutual Funds'),
    (5, 'ETFs'),
    (6, 'Commodities'),
    (7, 'Real Estate'),
    (8, 'Cryptocurrencies'),
    (9, 'Options'),
    (10, 'Futures'),
    (11, 'Derivatives'),
    (12, 'Art'),
    (13, 'Collectibles'),
    (14, 'Precious Metals')
;

INSERT INTO assets (id, asset_type, asset_name, ticker, base_pair_id)
VALUES (1, 1, 'US Dollar', 'USD', NULL),
    (2, 1, 'Euro', 'EUR', NULL),
    (3, 1, 'British Pound', 'GBP', NULL),
    (4, 2, 'Apple', 'AAPL', 1),
    (5, 5, 'Vanguard S&P 500 UCITS ETF', 'VUSA.L', 3)
;

INSERT INTO account_types (id, account_type_name)
VALUES (1, 'Current'),
    (2, 'ISA'),
    (3, 'Credit Card'),
    (4, 'SIPP'),
    (5, 'Workplace Pension'),
    (6, 'GIA'),
    (7, 'LISA'),
    (8, 'Mortgage'),
    (9, 'Savings')
;

INSERT INTO account_liquidity_types (id, liquidity_type_name)
VALUES (1, 'Liquid')
;

INSERT INTO asset_pairs (id, pair1, pair2)
VALUES (1, 4, 1),
    (2, 5, 3),
    (3, 1, 2),
    (4, 1, 3),
    (5, 2, 1),
    (6, 2, 3),
    (7, 3, 1),
    (8, 3, 2)
;

INSERT INTO asset_pairs_shared_metadata (pair_id, volume)
VALUES (1, 76249821)
;
