CREATE TABLE IF NOT EXISTS account_identifier (
    id UUID DEFAULT uuidv7() NOT NULL,
    account_id UUID NOT NULL,
    kind TEXT NOT NULL,
    value TEXT NOT NULL,
    CONSTRAINT account_identifier_pk PRIMARY KEY (id),
    CONSTRAINT account_identifier_account_fk FOREIGN KEY (account_id) REFERENCES account(id)
);
CREATE INDEX IF NOT EXISTS account_identifier_account_idx ON account_identifier (account_id);
CREATE INDEX IF NOT EXISTS account_identifier_value_idx ON account_identifier (value);
