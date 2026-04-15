// @ts-nocheck
/* tslint:disable */
/* eslint-disable */
/**
 * Sverto Personal Finance API
 * A comprehensive personal finance management API for tracking investments, expenses, and net worth over time. Features include transaction management, portfolio tracking, asset management, and detailed financial reporting.  # Sverto Personal Finance API  A comprehensive REST API for personal finance management, enabling users to track investments, expenses, transactions, and monitor net worth over time.  ## Key Features  - **Transaction Management**: Record and categorize financial transactions with support for various transaction types including purchases, sales, dividends, and transfers - **Portfolio Tracking**: Monitor investment holdings and performance across multiple accounts - **Asset Management**: Manage assets, asset pairs, and exchange rates for accurate portfolio valuation - **Account Management**: Organize finances across different account types with varying liquidity levels - **Net Worth Tracking**: Historical net worth calculations and trend analysis  ## Authentication  This API uses JWT (JSON Web Token) authentication. To access protected endpoints:  1. **Login**: POST `/api/auth` with username and password 2. **Authorization**: Include the JWT token in the `Authorization: Bearer <token>` header for all subsequent requests 3. **Token Format**: Bearer tokens are in JWT format with configurable expiration  ### Example Authentication Flow ```bash # Get JWT token curl -X POST /api/auth \\\\   -H \"Content-Type: application/json\" \\\\   -d \'{\"username\": \"your_username\", \"password\": \"your_password\"}\'  # Use token in requests curl -H \"Authorization: Bearer <your_jwt_token>\" \\\\   /api/users/{user_id}/accounts ```  # API Design Principles The API design _tries_ to follow the same design principles across all contracts.  ## Object relationships ### Identification Each entity has an identification, whether or not it is returned in response object is determined by the use case. - If we are querying a list of entities, the identification is always returned. - If we are querying a single entity, the is identification for the entity not returned in the response object, as it is used in query path. However, the identification for related entities is returned. - If we are creating a new entity using POST - the identification the entity and all its relationships is returned in response object. - If we are updating a single entity  the is identification for the entity not returned in the response object, as it is used in query path. However, the identification for related entities is returned.  ### Input data If we are querying an endpoint which has some object relationships, for input data (Request body, params or path), we provide only the `id` of the related object.   This is because in order to update or fetch something related, the assumption is that for the correct decision, the client mut have already up to date data about the related objects.  Example of this would be that if we want to update an asset to a different category, we would pass the category `id` and not the whole category object, as we would have known it before hand.  ### Response contracts For the relationships in response contracts, there are multiple approaches: - For responses which contain many objects with some kind of relationship, a lookup table is provided as part of the root response. For example, if we are querying a lot of arbitrary transactions, the response would contain a `metadata` object which would contain the `account` and `asset` lookup tables. This is to avoid duplication of the same object in the response. ```js GET /api/assets {     list: [         {             id: 1,             name: \"name\",             relationship: 5,         }     ],     lookup_tables: {         relationship: [                { id: 5, name: \"relationship_name\"}             ]         }     } } ``` - For queries, where only a single entity is returned without nested objects of array type, the relationship is expanded inplace. For example, if we query for a specific asset, the asset type would be returned as an object instead of the `id`. This is because the consumer could not know the necessary metadata beforehand and providing a lookup table for a single entity is not gud. ```js GET /api/assets/1 {     id: 1,     name: \"name\",     relationship: {         id: 5,         name: \"relationship_name\"     } } ``` - For queries where we are adding or updating data, we do not provide any lookup or expansion. The reason is the same as for input data - the client should have the necessary data to make the correct decision beforehand, so returning the same metadata is irrelevant. ```js POST /api/assets {     id: 1,     name: \"name\",     relationship: 5, } ``` - For queries that have recursion, lookup or expansion is not provided. This is to avoid ambiguity caused by recursion.  For example, if we query the asset entity, we get a list of related assets. If we were to expand the related assets, it would cause ambiguity for the client  as to how the rest of the objects are expanded. ```js GET /api/assets/1 {     id: 1,     name: \"name\",     related_asset: 2 } ```
 *
 * The version of the OpenAPI document: 1.0.0
 * Contact: einaras.garbasauskas@gmail.com
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import type { Configuration } from "./configuration";
import type { AxiosPromise, AxiosInstance, RawAxiosRequestConfig } from "axios";
import globalAxios from "axios";
// Some imports not used depending on template conditions
// @ts-ignore
import {
  DUMMY_BASE_URL,
  assertParamExists,
  setApiKeyToObject,
  setBasicAuthToObject,
  setBearerAuthToObject,
  setOAuthToObject,
  setSearchParams,
  serializeDataIfNeeded,
  toPathString,
  createRequestFunction,
} from "./common";
import type { RequestArgs } from "./base";
// @ts-ignore
import {
  BASE_PATH,
  COLLECTION_FORMATS,
  BaseAPI,
  RequiredError,
  operationServerMap,
} from "./base";

/**
 *
 * @export
 * @interface AccountAccountAccountTypeIdWithId
 */
export interface AccountAccountAccountTypeIdWithId {
  /**
   *
   * @type {string}
   * @memberof AccountAccountAccountTypeIdWithId
   */
  account_id: string;
  /**
   *
   * @type {number}
   * @memberof AccountAccountAccountTypeIdWithId
   */
  account_type: number;
  /**
   * Account name
   * @type {string}
   * @memberof AccountAccountAccountTypeIdWithId
   */
  name: string;
}
/**
 *
 * @export
 * @interface AccountFeesIdentifiableTransaction
 */
export interface AccountFeesIdentifiableTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AccountFeesIdentifiableTransaction
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof AccountFeesIdentifiableTransaction
   */
  entry: TransactionEntryWithEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithEntryId>}
   * @memberof AccountFeesIdentifiableTransaction
   */
  fees?: Array<TransactionFeeItemWithEntryId> | null;
  /**
   * Id representing the full transaction.
   * @type {string}
   * @memberof AccountFeesIdentifiableTransaction
   */
  transaction_id: string | null;
  /**
   *
   * @type {string}
   * @memberof AccountFeesIdentifiableTransaction
   */
  type: AccountFeesIdentifiableTransactionTypeEnum;
}

export const AccountFeesIdentifiableTransactionTypeEnum = {
  AccountFees: "account_fees",
} as const;

export type AccountFeesIdentifiableTransactionTypeEnum =
  (typeof AccountFeesIdentifiableTransactionTypeEnum)[keyof typeof AccountFeesIdentifiableTransactionTypeEnum];

/**
 *
 * @export
 * @interface AccountFeesRequiredIdentifiableTransaction
 */
export interface AccountFeesRequiredIdentifiableTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AccountFeesRequiredIdentifiableTransaction
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof AccountFeesRequiredIdentifiableTransaction
   */
  entry: TransactionEntryWithRequiredEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithRequiredEntryId>}
   * @memberof AccountFeesRequiredIdentifiableTransaction
   */
  fees?: Array<TransactionFeeItemWithRequiredEntryId> | null;
  /**
   * Id representing the full transaction.
   * @type {string}
   * @memberof AccountFeesRequiredIdentifiableTransaction
   */
  transaction_id: string;
  /**
   *
   * @type {string}
   * @memberof AccountFeesRequiredIdentifiableTransaction
   */
  type: AccountFeesRequiredIdentifiableTransactionTypeEnum;
}

export const AccountFeesRequiredIdentifiableTransactionTypeEnum = {
  AccountFees: "account_fees",
} as const;

export type AccountFeesRequiredIdentifiableTransactionTypeEnum =
  (typeof AccountFeesRequiredIdentifiableTransactionTypeEnum)[keyof typeof AccountFeesRequiredIdentifiableTransactionTypeEnum];

/**
 *
 * @export
 * @interface AccountFeesRequiredTransaction
 */
export interface AccountFeesRequiredTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AccountFeesRequiredTransaction
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof AccountFeesRequiredTransaction
   */
  entry: TransactionEntryWithRequiredEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithRequiredEntryId>}
   * @memberof AccountFeesRequiredTransaction
   */
  fees?: Array<TransactionFeeItemWithRequiredEntryId> | null;
  /**
   *
   * @type {string}
   * @memberof AccountFeesRequiredTransaction
   */
  type: AccountFeesRequiredTransactionTypeEnum;
}

export const AccountFeesRequiredTransactionTypeEnum = {
  AccountFees: "account_fees",
} as const;

export type AccountFeesRequiredTransactionTypeEnum =
  (typeof AccountFeesRequiredTransactionTypeEnum)[keyof typeof AccountFeesRequiredTransactionTypeEnum];

/**
 *
 * @export
 * @interface AccountFeesTransactionInput
 */
export interface AccountFeesTransactionInput {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AccountFeesTransactionInput
   */
  date: number;
  /**
   *
   * @type {TransactionEntry}
   * @memberof AccountFeesTransactionInput
   */
  entry: TransactionEntry;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItem>}
   * @memberof AccountFeesTransactionInput
   */
  fees?: Array<TransactionFeeItem> | null;
  /**
   *
   * @type {string}
   * @memberof AccountFeesTransactionInput
   */
  type: AccountFeesTransactionInputTypeEnum;
}

export const AccountFeesTransactionInputTypeEnum = {
  AccountFees: "account_fees",
} as const;

export type AccountFeesTransactionInputTypeEnum =
  (typeof AccountFeesTransactionInputTypeEnum)[keyof typeof AccountFeesTransactionInputTypeEnum];

/**
 *
 * @export
 * @interface AccountFeesTransactionWithEntryIds
 */
export interface AccountFeesTransactionWithEntryIds {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AccountFeesTransactionWithEntryIds
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof AccountFeesTransactionWithEntryIds
   */
  entry: TransactionEntryWithEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithEntryId>}
   * @memberof AccountFeesTransactionWithEntryIds
   */
  fees?: Array<TransactionFeeItemWithEntryId> | null;
  /**
   *
   * @type {string}
   * @memberof AccountFeesTransactionWithEntryIds
   */
  type: AccountFeesTransactionWithEntryIdsTypeEnum;
}

export const AccountFeesTransactionWithEntryIdsTypeEnum = {
  AccountFees: "account_fees",
} as const;

export type AccountFeesTransactionWithEntryIdsTypeEnum =
  (typeof AccountFeesTransactionWithEntryIdsTypeEnum)[keyof typeof AccountFeesTransactionWithEntryIdsTypeEnum];

/**
 *
 * @export
 * @interface AccountMetadataLookupTables
 */
export interface AccountMetadataLookupTables {
  /**
   *
   * @type {Array<IdentifiableAccountType>}
   * @memberof AccountMetadataLookupTables
   */
  account_liquidity_types: Array<IdentifiableAccountType>;
  /**
   *
   * @type {Array<IdentifiableAccountType>}
   * @memberof AccountMetadataLookupTables
   */
  account_types: Array<IdentifiableAccountType>;
}
/**
 *
 * @export
 * @interface AccountTransactionsPage
 */
export interface AccountTransactionsPage {
  /**
   * The lookup tables for the results
   * @type {MetadataLookupTables}
   * @memberof AccountTransactionsPage
   */
  lookup_tables: MetadataLookupTables;
  /**
   * One page of results
   * @type {Array<RequiredIdentifiableTransaction>}
   * @memberof AccountTransactionsPage
   */
  results: Array<RequiredIdentifiableTransaction>;
  /**
   * The total number of results available
   * @type {number}
   * @memberof AccountTransactionsPage
   */
  total_results: number;
}
/**
 *
 * @export
 * @interface AddAccountResponse
 */
export interface AddAccountResponse {
  /**
   *
   * @type {string}
   * @memberof AddAccountResponse
   */
  account_id: string;
  /**
   *
   * @type {number}
   * @memberof AddAccountResponse
   */
  account_type: number;
  /**
   *
   * @type {number}
   * @memberof AddAccountResponse
   */
  liquidity_type: number;
  /**
   * Account name
   * @type {string}
   * @memberof AddAccountResponse
   */
  name: string;
  /**
   * Ownership share. Must be > 0 and <= 1.
   * @type {number}
   * @memberof AddAccountResponse
   */
  ownership_share: number;
}
/**
 *
 * @export
 * @interface AddAssetPairRatesRequest
 */
export interface AddAssetPairRatesRequest {
  /**
   *
   * @type {Array<AssetRate>}
   * @memberof AddAssetPairRatesRequest
   */
  rates: Array<AssetRate>;
}
/**
 *
 * @export
 * @interface AddAssetPairRequest
 */
export interface AddAssetPairRequest {
  /**
   *
   * @type {number}
   * @memberof AddAssetPairRequest
   */
  reference_id: number;
}
/**
 *
 * @export
 * @interface AddAssetPairResponse
 */
export interface AddAssetPairResponse {
  /**
   *
   * @type {number}
   * @memberof AddAssetPairResponse
   */
  main_asset_id: number;
  /**
   *
   * @type {AssetPairMetadata}
   * @memberof AddAssetPairResponse
   */
  metadata?: AssetPairMetadata | null;
  /**
   *
   * @type {number}
   * @memberof AddAssetPairResponse
   */
  reference_asset_id: number;
  /**
   *
   * @type {UserAssetPairMetadata}
   * @memberof AddAssetPairResponse
   */
  user_metadata?: UserAssetPairMetadata | null;
}
/**
 *
 * @export
 * @interface AddAssetRequest
 */
export interface AddAssetRequest {
  /**
   *
   * @type {number}
   * @memberof AddAssetRequest
   */
  asset_type: number;
  /**
   * The id of an asset to which this asset is usually exchanged to.
   * @type {number}
   * @memberof AddAssetRequest
   */
  base_asset_id: number;
  /**
   * Full name of the asset
   * @type {string}
   * @memberof AddAssetRequest
   */
  name: string;
  /**
   * Short letter abbreviation of the asset
   * @type {string}
   * @memberof AddAssetRequest
   */
  ticker: string;
}
/**
 *
 * @export
 * @interface AddAssetResponse
 */
export interface AddAssetResponse {
  /**
   *
   * @type {number}
   * @memberof AddAssetResponse
   */
  asset_id: number;
  /**
   *
   * @type {number}
   * @memberof AddAssetResponse
   */
  asset_type: number;
  /**
   * The id of an asset to which this asset is usually exchanged to.
   * @type {number}
   * @memberof AddAssetResponse
   */
  base_asset_id: number;
  /**
   * Full name of the asset
   * @type {string}
   * @memberof AddAssetResponse
   */
  name: string;
  /**
   * Short letter abbreviation of the asset
   * @type {string}
   * @memberof AddAssetResponse
   */
  ticker: string;
}
/**
 *
 * @export
 * @interface AddIndividualTransactionRequest
 */
export interface AddIndividualTransactionRequest {
  /**
   * Individual transaction to be added
   * @type {TransactionInput}
   * @memberof AddIndividualTransactionRequest
   */
  transaction: TransactionInput;
}
/**
 *
 * @export
 * @interface AddIndividualTransactionResponse
 */
export interface AddIndividualTransactionResponse {
  /**
   *
   * @type {RequiredIdentifiableTransaction}
   * @memberof AddIndividualTransactionResponse
   */
  transaction: RequiredIdentifiableTransaction;
}
/**
 *
 * @export
 * @interface AddTransactionGroupResponse
 */
export interface AddTransactionGroupResponse {
  /**
   *
   * @type {Array<AccountAccountAccountTypeIdWithId>}
   * @memberof AddTransactionGroupResponse
   */
  accounts: Array<AccountAccountAccountTypeIdWithId>;
  /**
   *
   * @type {Array<AssetAssetRequiredAssetTypeIdWithId>}
   * @memberof AddTransactionGroupResponse
   */
  assets: Array<AssetAssetRequiredAssetTypeIdWithId>;
  /**
   *
   * @type {Array<CategoryRequiredCategoryTypeIdWithId>}
   * @memberof AddTransactionGroupResponse
   */
  categories?: Array<CategoryRequiredCategoryTypeIdWithId>;
  /**
   *
   * @type {TransactionGroupTransactionGroupIdTransactionGroupRequiredIdentifiableTransactionWithIdentifiableEntriesAndId}
   * @memberof AddTransactionGroupResponse
   */
  group: TransactionGroupTransactionGroupIdTransactionGroupRequiredIdentifiableTransactionWithIdentifiableEntriesAndId;
}
/**
 *
 * @export
 * @interface AddUser
 */
export interface AddUser {
  /**
   * User password. Must be between 8 and 200 characters. Whitespace is preserved.  **Deserialize-only** — this type intentionally does not implement `Serialize` to prevent raw passwords from being accidentally exposed in API responses or logs.
   * @type {string}
   * @memberof AddUser
   */
  password: string;
  /**
   * Username
   * @type {string}
   * @memberof AddUser
   */
  username: string;
}
/**
 *
 * @export
 * @interface ApiErrorResponse
 */
export interface ApiErrorResponse {
  /**
   *
   * @type {object}
   * @memberof ApiErrorResponse
   */
  details?: object | null;
  /**
   *
   * @type {ErrorType}
   * @memberof ApiErrorResponse
   */
  error_type: ErrorType;
  /**
   *
   * @type {Array<FieldError>}
   * @memberof ApiErrorResponse
   */
  errors: Array<FieldError>;
  /**
   *
   * @type {string}
   * @memberof ApiErrorResponse
   */
  message: string;
  /**
   *
   * @type {string}
   * @memberof ApiErrorResponse
   */
  stack_trace?: string | null;
}

/**
 *
 * @export
 * @interface AssetAssetRequiredAssetTypeIdWithId
 */
export interface AssetAssetRequiredAssetTypeIdWithId {
  /**
   *
   * @type {number}
   * @memberof AssetAssetRequiredAssetTypeIdWithId
   */
  asset_id: number;
  /**
   *
   * @type {number}
   * @memberof AssetAssetRequiredAssetTypeIdWithId
   */
  asset_type: number;
  /**
   * Full name of the asset
   * @type {string}
   * @memberof AssetAssetRequiredAssetTypeIdWithId
   */
  name: string;
  /**
   * Short letter abbreviation of the asset
   * @type {string}
   * @memberof AssetAssetRequiredAssetTypeIdWithId
   */
  ticker: string;
}
/**
 *
 * @export
 * @interface AssetBalanceTransferIdentifiableTransaction
 */
export interface AssetBalanceTransferIdentifiableTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetBalanceTransferIdentifiableTransaction
   */
  date: number;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithEntryId>}
   * @memberof AssetBalanceTransferIdentifiableTransaction
   */
  fees?: Array<TransactionFeeItemWithEntryId> | null;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof AssetBalanceTransferIdentifiableTransaction
   */
  incoming_change: TransactionEntryWithEntryId;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof AssetBalanceTransferIdentifiableTransaction
   */
  outgoing_change: TransactionEntryWithEntryId;
  /**
   * Id representing the full transaction.
   * @type {string}
   * @memberof AssetBalanceTransferIdentifiableTransaction
   */
  transaction_id: string | null;
  /**
   *
   * @type {string}
   * @memberof AssetBalanceTransferIdentifiableTransaction
   */
  type: AssetBalanceTransferIdentifiableTransactionTypeEnum;
}

export const AssetBalanceTransferIdentifiableTransactionTypeEnum = {
  AssetBalanceTransfer: "asset_balance_transfer",
} as const;

export type AssetBalanceTransferIdentifiableTransactionTypeEnum =
  (typeof AssetBalanceTransferIdentifiableTransactionTypeEnum)[keyof typeof AssetBalanceTransferIdentifiableTransactionTypeEnum];

/**
 *
 * @export
 * @interface AssetBalanceTransferRequiredIdentifiableTransaction
 */
export interface AssetBalanceTransferRequiredIdentifiableTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetBalanceTransferRequiredIdentifiableTransaction
   */
  date: number;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithRequiredEntryId>}
   * @memberof AssetBalanceTransferRequiredIdentifiableTransaction
   */
  fees?: Array<TransactionFeeItemWithRequiredEntryId> | null;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof AssetBalanceTransferRequiredIdentifiableTransaction
   */
  incoming_change: TransactionEntryWithRequiredEntryId;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof AssetBalanceTransferRequiredIdentifiableTransaction
   */
  outgoing_change: TransactionEntryWithRequiredEntryId;
  /**
   * Id representing the full transaction.
   * @type {string}
   * @memberof AssetBalanceTransferRequiredIdentifiableTransaction
   */
  transaction_id: string;
  /**
   *
   * @type {string}
   * @memberof AssetBalanceTransferRequiredIdentifiableTransaction
   */
  type: AssetBalanceTransferRequiredIdentifiableTransactionTypeEnum;
}

export const AssetBalanceTransferRequiredIdentifiableTransactionTypeEnum = {
  AssetBalanceTransfer: "asset_balance_transfer",
} as const;

export type AssetBalanceTransferRequiredIdentifiableTransactionTypeEnum =
  (typeof AssetBalanceTransferRequiredIdentifiableTransactionTypeEnum)[keyof typeof AssetBalanceTransferRequiredIdentifiableTransactionTypeEnum];

/**
 *
 * @export
 * @interface AssetBalanceTransferRequiredTransaction
 */
export interface AssetBalanceTransferRequiredTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetBalanceTransferRequiredTransaction
   */
  date: number;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithRequiredEntryId>}
   * @memberof AssetBalanceTransferRequiredTransaction
   */
  fees?: Array<TransactionFeeItemWithRequiredEntryId> | null;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof AssetBalanceTransferRequiredTransaction
   */
  incoming_change: TransactionEntryWithRequiredEntryId;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof AssetBalanceTransferRequiredTransaction
   */
  outgoing_change: TransactionEntryWithRequiredEntryId;
  /**
   *
   * @type {string}
   * @memberof AssetBalanceTransferRequiredTransaction
   */
  type: AssetBalanceTransferRequiredTransactionTypeEnum;
}

export const AssetBalanceTransferRequiredTransactionTypeEnum = {
  AssetBalanceTransfer: "asset_balance_transfer",
} as const;

export type AssetBalanceTransferRequiredTransactionTypeEnum =
  (typeof AssetBalanceTransferRequiredTransactionTypeEnum)[keyof typeof AssetBalanceTransferRequiredTransactionTypeEnum];

/**
 *
 * @export
 * @interface AssetBalanceTransferTransactionInput
 */
export interface AssetBalanceTransferTransactionInput {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetBalanceTransferTransactionInput
   */
  date: number;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItem>}
   * @memberof AssetBalanceTransferTransactionInput
   */
  fees?: Array<TransactionFeeItem> | null;
  /**
   *
   * @type {TransactionEntry}
   * @memberof AssetBalanceTransferTransactionInput
   */
  incoming_change: TransactionEntry;
  /**
   *
   * @type {TransactionEntry}
   * @memberof AssetBalanceTransferTransactionInput
   */
  outgoing_change: TransactionEntry;
  /**
   *
   * @type {string}
   * @memberof AssetBalanceTransferTransactionInput
   */
  type: AssetBalanceTransferTransactionInputTypeEnum;
}

export const AssetBalanceTransferTransactionInputTypeEnum = {
  AssetBalanceTransfer: "asset_balance_transfer",
} as const;

export type AssetBalanceTransferTransactionInputTypeEnum =
  (typeof AssetBalanceTransferTransactionInputTypeEnum)[keyof typeof AssetBalanceTransferTransactionInputTypeEnum];

/**
 *
 * @export
 * @interface AssetBalanceTransferTransactionWithEntryIds
 */
export interface AssetBalanceTransferTransactionWithEntryIds {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetBalanceTransferTransactionWithEntryIds
   */
  date: number;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithEntryId>}
   * @memberof AssetBalanceTransferTransactionWithEntryIds
   */
  fees?: Array<TransactionFeeItemWithEntryId> | null;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof AssetBalanceTransferTransactionWithEntryIds
   */
  incoming_change: TransactionEntryWithEntryId;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof AssetBalanceTransferTransactionWithEntryIds
   */
  outgoing_change: TransactionEntryWithEntryId;
  /**
   *
   * @type {string}
   * @memberof AssetBalanceTransferTransactionWithEntryIds
   */
  type: AssetBalanceTransferTransactionWithEntryIdsTypeEnum;
}

export const AssetBalanceTransferTransactionWithEntryIdsTypeEnum = {
  AssetBalanceTransfer: "asset_balance_transfer",
} as const;

export type AssetBalanceTransferTransactionWithEntryIdsTypeEnum =
  (typeof AssetBalanceTransferTransactionWithEntryIdsTypeEnum)[keyof typeof AssetBalanceTransferTransactionWithEntryIdsTypeEnum];

/**
 *
 * @export
 * @interface AssetDividendIdentifiableTransaction
 */
export interface AssetDividendIdentifiableTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetDividendIdentifiableTransaction
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof AssetDividendIdentifiableTransaction
   */
  entry: TransactionEntryWithEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithEntryId>}
   * @memberof AssetDividendIdentifiableTransaction
   */
  fees?: Array<TransactionFeeItemWithEntryId> | null;
  /**
   * Id representing the full transaction.
   * @type {string}
   * @memberof AssetDividendIdentifiableTransaction
   */
  transaction_id: string | null;
  /**
   *
   * @type {string}
   * @memberof AssetDividendIdentifiableTransaction
   */
  type: AssetDividendIdentifiableTransactionTypeEnum;
}

export const AssetDividendIdentifiableTransactionTypeEnum = {
  AssetDividend: "asset_dividend",
} as const;

export type AssetDividendIdentifiableTransactionTypeEnum =
  (typeof AssetDividendIdentifiableTransactionTypeEnum)[keyof typeof AssetDividendIdentifiableTransactionTypeEnum];

/**
 *
 * @export
 * @interface AssetDividendRequiredIdentifiableTransaction
 */
export interface AssetDividendRequiredIdentifiableTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetDividendRequiredIdentifiableTransaction
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof AssetDividendRequiredIdentifiableTransaction
   */
  entry: TransactionEntryWithRequiredEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithRequiredEntryId>}
   * @memberof AssetDividendRequiredIdentifiableTransaction
   */
  fees?: Array<TransactionFeeItemWithRequiredEntryId> | null;
  /**
   * Id representing the full transaction.
   * @type {string}
   * @memberof AssetDividendRequiredIdentifiableTransaction
   */
  transaction_id: string;
  /**
   *
   * @type {string}
   * @memberof AssetDividendRequiredIdentifiableTransaction
   */
  type: AssetDividendRequiredIdentifiableTransactionTypeEnum;
}

export const AssetDividendRequiredIdentifiableTransactionTypeEnum = {
  AssetDividend: "asset_dividend",
} as const;

export type AssetDividendRequiredIdentifiableTransactionTypeEnum =
  (typeof AssetDividendRequiredIdentifiableTransactionTypeEnum)[keyof typeof AssetDividendRequiredIdentifiableTransactionTypeEnum];

/**
 *
 * @export
 * @interface AssetDividendRequiredTransaction
 */
export interface AssetDividendRequiredTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetDividendRequiredTransaction
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof AssetDividendRequiredTransaction
   */
  entry: TransactionEntryWithRequiredEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithRequiredEntryId>}
   * @memberof AssetDividendRequiredTransaction
   */
  fees?: Array<TransactionFeeItemWithRequiredEntryId> | null;
  /**
   *
   * @type {string}
   * @memberof AssetDividendRequiredTransaction
   */
  type: AssetDividendRequiredTransactionTypeEnum;
}

export const AssetDividendRequiredTransactionTypeEnum = {
  AssetDividend: "asset_dividend",
} as const;

export type AssetDividendRequiredTransactionTypeEnum =
  (typeof AssetDividendRequiredTransactionTypeEnum)[keyof typeof AssetDividendRequiredTransactionTypeEnum];

/**
 *
 * @export
 * @interface AssetDividendTransactionInput
 */
export interface AssetDividendTransactionInput {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetDividendTransactionInput
   */
  date: number;
  /**
   *
   * @type {TransactionEntry}
   * @memberof AssetDividendTransactionInput
   */
  entry: TransactionEntry;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItem>}
   * @memberof AssetDividendTransactionInput
   */
  fees?: Array<TransactionFeeItem> | null;
  /**
   *
   * @type {string}
   * @memberof AssetDividendTransactionInput
   */
  type: AssetDividendTransactionInputTypeEnum;
}

export const AssetDividendTransactionInputTypeEnum = {
  AssetDividend: "asset_dividend",
} as const;

export type AssetDividendTransactionInputTypeEnum =
  (typeof AssetDividendTransactionInputTypeEnum)[keyof typeof AssetDividendTransactionInputTypeEnum];

/**
 *
 * @export
 * @interface AssetDividendTransactionWithEntryIds
 */
export interface AssetDividendTransactionWithEntryIds {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetDividendTransactionWithEntryIds
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof AssetDividendTransactionWithEntryIds
   */
  entry: TransactionEntryWithEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithEntryId>}
   * @memberof AssetDividendTransactionWithEntryIds
   */
  fees?: Array<TransactionFeeItemWithEntryId> | null;
  /**
   *
   * @type {string}
   * @memberof AssetDividendTransactionWithEntryIds
   */
  type: AssetDividendTransactionWithEntryIdsTypeEnum;
}

export const AssetDividendTransactionWithEntryIdsTypeEnum = {
  AssetDividend: "asset_dividend",
} as const;

export type AssetDividendTransactionWithEntryIdsTypeEnum =
  (typeof AssetDividendTransactionWithEntryIdsTypeEnum)[keyof typeof AssetDividendTransactionWithEntryIdsTypeEnum];

/**
 *
 * @export
 * @interface AssetIdentifiableAssetType
 */
export interface AssetIdentifiableAssetType {
  /**
   *
   * @type {IdentifiableAssetType}
   * @memberof AssetIdentifiableAssetType
   */
  asset_type: IdentifiableAssetType;
  /**
   * Full name of the asset
   * @type {string}
   * @memberof AssetIdentifiableAssetType
   */
  name: string;
  /**
   * Short letter abbreviation of the asset
   * @type {string}
   * @memberof AssetIdentifiableAssetType
   */
  ticker: string;
}
/**
 *
 * @export
 * @interface AssetLookupTables
 */
export interface AssetLookupTables {
  /**
   *
   * @type {Array<IdentifiableAssetType>}
   * @memberof AssetLookupTables
   */
  asset_types: Array<IdentifiableAssetType>;
}
/**
 *
 * @export
 * @interface AssetPairInfo
 */
export interface AssetPairInfo {
  /**
   *
   * @type {number}
   * @memberof AssetPairInfo
   */
  asset_id: number;
  /**
   *
   * @type {string}
   * @memberof AssetPairInfo
   */
  name: string;
  /**
   *
   * @type {string}
   * @memberof AssetPairInfo
   */
  ticker: string;
}
/**
 *
 * @export
 * @interface AssetPairMetadata
 */
export interface AssetPairMetadata {
  /**
   *
   * @type {number}
   * @memberof AssetPairMetadata
   */
  last_updated: number;
  /**
   *
   * @type {number}
   * @memberof AssetPairMetadata
   */
  latest_rate: number;
}
/**
 *
 * @export
 * @interface AssetPortfolio
 */
export interface AssetPortfolio {
  /**
   *
   * @type {string}
   * @memberof AssetPortfolio
   */
  account_id: string;
  /**
   *
   * @type {number}
   * @memberof AssetPortfolio
   */
  asset_id: number;
  /**
   *
   * @type {number}
   * @memberof AssetPortfolio
   */
  cash_dividends: number;
  /**
   *
   * @type {Array<AssetPortfolioPosition>}
   * @memberof AssetPortfolio
   */
  positions: Array<AssetPortfolioPosition>;
  /**
   *
   * @type {number}
   * @memberof AssetPortfolio
   */
  realized_gains: number;
  /**
   *
   * @type {number}
   * @memberof AssetPortfolio
   */
  total_cost_basis: number;
  /**
   *
   * @type {number}
   * @memberof AssetPortfolio
   */
  total_fees: number;
  /**
   *
   * @type {number}
   * @memberof AssetPortfolio
   */
  total_gains: number;
  /**
   *
   * @type {number}
   * @memberof AssetPortfolio
   */
  total_units: number;
  /**
   *
   * @type {number}
   * @memberof AssetPortfolio
   */
  unit_cost_basis: number;
  /**
   *
   * @type {number}
   * @memberof AssetPortfolio
   */
  unrealized_gains: number;
}
/**
 *
 * @export
 * @interface AssetPortfolioPosition
 */
export interface AssetPortfolioPosition {
  /**
   *
   * @type {string}
   * @memberof AssetPortfolioPosition
   */
  add_date: string;
  /**
   *
   * @type {number}
   * @memberof AssetPortfolioPosition
   */
  add_price: number;
  /**
   *
   * @type {number}
   * @memberof AssetPortfolioPosition
   */
  amount_left: number;
  /**
   *
   * @type {number}
   * @memberof AssetPortfolioPosition
   */
  amount_sold: number;
  /**
   *
   * @type {number}
   * @memberof AssetPortfolioPosition
   */
  fees: number;
  /**
   *
   * @type {boolean}
   * @memberof AssetPortfolioPosition
   */
  is_dividend: boolean;
  /**
   *
   * @type {number}
   * @memberof AssetPortfolioPosition
   */
  quantity_added: number;
  /**
   *
   * @type {number}
   * @memberof AssetPortfolioPosition
   */
  realized_gains: number;
  /**
   *
   * @type {number}
   * @memberof AssetPortfolioPosition
   */
  sale_proceeds: number;
  /**
   *
   * @type {number}
   * @memberof AssetPortfolioPosition
   */
  total_cost_basis: number;
  /**
   *
   * @type {number}
   * @memberof AssetPortfolioPosition
   */
  total_gains: number;
  /**
   *
   * @type {number}
   * @memberof AssetPortfolioPosition
   */
  unit_cost_basis: number;
  /**
   *
   * @type {number}
   * @memberof AssetPortfolioPosition
   */
  unrealized_gains: number;
}
/**
 *
 * @export
 * @interface AssetPurchaseIdentifiableTransaction
 */
export interface AssetPurchaseIdentifiableTransaction {
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof AssetPurchaseIdentifiableTransaction
   */
  cash_outgoings_change: TransactionEntryWithEntryId;
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetPurchaseIdentifiableTransaction
   */
  date: number;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithEntryId>}
   * @memberof AssetPurchaseIdentifiableTransaction
   */
  fees?: Array<TransactionFeeItemWithEntryId> | null;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof AssetPurchaseIdentifiableTransaction
   */
  purchase_change: TransactionEntryWithEntryId;
  /**
   * Id representing the full transaction.
   * @type {string}
   * @memberof AssetPurchaseIdentifiableTransaction
   */
  transaction_id: string | null;
  /**
   *
   * @type {string}
   * @memberof AssetPurchaseIdentifiableTransaction
   */
  type: AssetPurchaseIdentifiableTransactionTypeEnum;
}

export const AssetPurchaseIdentifiableTransactionTypeEnum = {
  AssetPurchase: "asset_purchase",
} as const;

export type AssetPurchaseIdentifiableTransactionTypeEnum =
  (typeof AssetPurchaseIdentifiableTransactionTypeEnum)[keyof typeof AssetPurchaseIdentifiableTransactionTypeEnum];

/**
 *
 * @export
 * @interface AssetPurchaseRequiredIdentifiableTransaction
 */
export interface AssetPurchaseRequiredIdentifiableTransaction {
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof AssetPurchaseRequiredIdentifiableTransaction
   */
  cash_outgoings_change: TransactionEntryWithRequiredEntryId;
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetPurchaseRequiredIdentifiableTransaction
   */
  date: number;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithRequiredEntryId>}
   * @memberof AssetPurchaseRequiredIdentifiableTransaction
   */
  fees?: Array<TransactionFeeItemWithRequiredEntryId> | null;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof AssetPurchaseRequiredIdentifiableTransaction
   */
  purchase_change: TransactionEntryWithRequiredEntryId;
  /**
   * Id representing the full transaction.
   * @type {string}
   * @memberof AssetPurchaseRequiredIdentifiableTransaction
   */
  transaction_id: string;
  /**
   *
   * @type {string}
   * @memberof AssetPurchaseRequiredIdentifiableTransaction
   */
  type: AssetPurchaseRequiredIdentifiableTransactionTypeEnum;
}

export const AssetPurchaseRequiredIdentifiableTransactionTypeEnum = {
  AssetPurchase: "asset_purchase",
} as const;

export type AssetPurchaseRequiredIdentifiableTransactionTypeEnum =
  (typeof AssetPurchaseRequiredIdentifiableTransactionTypeEnum)[keyof typeof AssetPurchaseRequiredIdentifiableTransactionTypeEnum];

/**
 *
 * @export
 * @interface AssetPurchaseRequiredTransaction
 */
export interface AssetPurchaseRequiredTransaction {
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof AssetPurchaseRequiredTransaction
   */
  cash_outgoings_change: TransactionEntryWithRequiredEntryId;
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetPurchaseRequiredTransaction
   */
  date: number;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithRequiredEntryId>}
   * @memberof AssetPurchaseRequiredTransaction
   */
  fees?: Array<TransactionFeeItemWithRequiredEntryId> | null;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof AssetPurchaseRequiredTransaction
   */
  purchase_change: TransactionEntryWithRequiredEntryId;
  /**
   *
   * @type {string}
   * @memberof AssetPurchaseRequiredTransaction
   */
  type: AssetPurchaseRequiredTransactionTypeEnum;
}

export const AssetPurchaseRequiredTransactionTypeEnum = {
  AssetPurchase: "asset_purchase",
} as const;

export type AssetPurchaseRequiredTransactionTypeEnum =
  (typeof AssetPurchaseRequiredTransactionTypeEnum)[keyof typeof AssetPurchaseRequiredTransactionTypeEnum];

/**
 *
 * @export
 * @interface AssetPurchaseTransactionInput
 */
export interface AssetPurchaseTransactionInput {
  /**
   *
   * @type {TransactionEntry}
   * @memberof AssetPurchaseTransactionInput
   */
  cash_outgoings_change: TransactionEntry;
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetPurchaseTransactionInput
   */
  date: number;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItem>}
   * @memberof AssetPurchaseTransactionInput
   */
  fees?: Array<TransactionFeeItem> | null;
  /**
   *
   * @type {TransactionEntry}
   * @memberof AssetPurchaseTransactionInput
   */
  purchase_change: TransactionEntry;
  /**
   *
   * @type {string}
   * @memberof AssetPurchaseTransactionInput
   */
  type: AssetPurchaseTransactionInputTypeEnum;
}

export const AssetPurchaseTransactionInputTypeEnum = {
  AssetPurchase: "asset_purchase",
} as const;

export type AssetPurchaseTransactionInputTypeEnum =
  (typeof AssetPurchaseTransactionInputTypeEnum)[keyof typeof AssetPurchaseTransactionInputTypeEnum];

/**
 *
 * @export
 * @interface AssetPurchaseTransactionWithEntryIds
 */
export interface AssetPurchaseTransactionWithEntryIds {
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof AssetPurchaseTransactionWithEntryIds
   */
  cash_outgoings_change: TransactionEntryWithEntryId;
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetPurchaseTransactionWithEntryIds
   */
  date: number;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithEntryId>}
   * @memberof AssetPurchaseTransactionWithEntryIds
   */
  fees?: Array<TransactionFeeItemWithEntryId> | null;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof AssetPurchaseTransactionWithEntryIds
   */
  purchase_change: TransactionEntryWithEntryId;
  /**
   *
   * @type {string}
   * @memberof AssetPurchaseTransactionWithEntryIds
   */
  type: AssetPurchaseTransactionWithEntryIdsTypeEnum;
}

export const AssetPurchaseTransactionWithEntryIdsTypeEnum = {
  AssetPurchase: "asset_purchase",
} as const;

export type AssetPurchaseTransactionWithEntryIdsTypeEnum =
  (typeof AssetPurchaseTransactionWithEntryIdsTypeEnum)[keyof typeof AssetPurchaseTransactionWithEntryIdsTypeEnum];

/**
 *
 * @export
 * @interface AssetRate
 */
export interface AssetRate {
  /**
   *
   * @type {number}
   * @memberof AssetRate
   */
  date: number;
  /**
   * Positive rate (e.g. exchange rate). Must be strictly greater than zero.
   * @type {number}
   * @memberof AssetRate
   */
  rate: number;
}
/**
 *
 * @export
 * @interface AssetSaleIdentifiableTransaction
 */
export interface AssetSaleIdentifiableTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetSaleIdentifiableTransaction
   */
  date: number;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithEntryId>}
   * @memberof AssetSaleIdentifiableTransaction
   */
  fees?: Array<TransactionFeeItemWithEntryId> | null;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof AssetSaleIdentifiableTransaction
   */
  proceeds_entry: TransactionEntryWithEntryId;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof AssetSaleIdentifiableTransaction
   */
  sale_entry: TransactionEntryWithEntryId;
  /**
   * Id representing the full transaction.
   * @type {string}
   * @memberof AssetSaleIdentifiableTransaction
   */
  transaction_id: string | null;
  /**
   *
   * @type {string}
   * @memberof AssetSaleIdentifiableTransaction
   */
  type: AssetSaleIdentifiableTransactionTypeEnum;
}

export const AssetSaleIdentifiableTransactionTypeEnum = {
  AssetSale: "asset_sale",
} as const;

export type AssetSaleIdentifiableTransactionTypeEnum =
  (typeof AssetSaleIdentifiableTransactionTypeEnum)[keyof typeof AssetSaleIdentifiableTransactionTypeEnum];

/**
 *
 * @export
 * @interface AssetSaleRequiredIdentifiableTransaction
 */
export interface AssetSaleRequiredIdentifiableTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetSaleRequiredIdentifiableTransaction
   */
  date: number;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithRequiredEntryId>}
   * @memberof AssetSaleRequiredIdentifiableTransaction
   */
  fees?: Array<TransactionFeeItemWithRequiredEntryId> | null;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof AssetSaleRequiredIdentifiableTransaction
   */
  proceeds_entry: TransactionEntryWithRequiredEntryId;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof AssetSaleRequiredIdentifiableTransaction
   */
  sale_entry: TransactionEntryWithRequiredEntryId;
  /**
   * Id representing the full transaction.
   * @type {string}
   * @memberof AssetSaleRequiredIdentifiableTransaction
   */
  transaction_id: string;
  /**
   *
   * @type {string}
   * @memberof AssetSaleRequiredIdentifiableTransaction
   */
  type: AssetSaleRequiredIdentifiableTransactionTypeEnum;
}

export const AssetSaleRequiredIdentifiableTransactionTypeEnum = {
  AssetSale: "asset_sale",
} as const;

export type AssetSaleRequiredIdentifiableTransactionTypeEnum =
  (typeof AssetSaleRequiredIdentifiableTransactionTypeEnum)[keyof typeof AssetSaleRequiredIdentifiableTransactionTypeEnum];

/**
 *
 * @export
 * @interface AssetSaleRequiredTransaction
 */
export interface AssetSaleRequiredTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetSaleRequiredTransaction
   */
  date: number;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithRequiredEntryId>}
   * @memberof AssetSaleRequiredTransaction
   */
  fees?: Array<TransactionFeeItemWithRequiredEntryId> | null;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof AssetSaleRequiredTransaction
   */
  proceeds_entry: TransactionEntryWithRequiredEntryId;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof AssetSaleRequiredTransaction
   */
  sale_entry: TransactionEntryWithRequiredEntryId;
  /**
   *
   * @type {string}
   * @memberof AssetSaleRequiredTransaction
   */
  type: AssetSaleRequiredTransactionTypeEnum;
}

export const AssetSaleRequiredTransactionTypeEnum = {
  AssetSale: "asset_sale",
} as const;

export type AssetSaleRequiredTransactionTypeEnum =
  (typeof AssetSaleRequiredTransactionTypeEnum)[keyof typeof AssetSaleRequiredTransactionTypeEnum];

/**
 *
 * @export
 * @interface AssetSaleTransactionInput
 */
export interface AssetSaleTransactionInput {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetSaleTransactionInput
   */
  date: number;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItem>}
   * @memberof AssetSaleTransactionInput
   */
  fees?: Array<TransactionFeeItem> | null;
  /**
   *
   * @type {TransactionEntry}
   * @memberof AssetSaleTransactionInput
   */
  proceeds_entry: TransactionEntry;
  /**
   *
   * @type {TransactionEntry}
   * @memberof AssetSaleTransactionInput
   */
  sale_entry: TransactionEntry;
  /**
   *
   * @type {string}
   * @memberof AssetSaleTransactionInput
   */
  type: AssetSaleTransactionInputTypeEnum;
}

export const AssetSaleTransactionInputTypeEnum = {
  AssetSale: "asset_sale",
} as const;

export type AssetSaleTransactionInputTypeEnum =
  (typeof AssetSaleTransactionInputTypeEnum)[keyof typeof AssetSaleTransactionInputTypeEnum];

/**
 *
 * @export
 * @interface AssetSaleTransactionWithEntryIds
 */
export interface AssetSaleTransactionWithEntryIds {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetSaleTransactionWithEntryIds
   */
  date: number;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithEntryId>}
   * @memberof AssetSaleTransactionWithEntryIds
   */
  fees?: Array<TransactionFeeItemWithEntryId> | null;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof AssetSaleTransactionWithEntryIds
   */
  proceeds_entry: TransactionEntryWithEntryId;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof AssetSaleTransactionWithEntryIds
   */
  sale_entry: TransactionEntryWithEntryId;
  /**
   *
   * @type {string}
   * @memberof AssetSaleTransactionWithEntryIds
   */
  type: AssetSaleTransactionWithEntryIdsTypeEnum;
}

export const AssetSaleTransactionWithEntryIdsTypeEnum = {
  AssetSale: "asset_sale",
} as const;

export type AssetSaleTransactionWithEntryIdsTypeEnum =
  (typeof AssetSaleTransactionWithEntryIdsTypeEnum)[keyof typeof AssetSaleTransactionWithEntryIdsTypeEnum];

/**
 *
 * @export
 * @interface AssetTradeIdentifiableTransaction
 */
export interface AssetTradeIdentifiableTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetTradeIdentifiableTransaction
   */
  date: number;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithEntryId>}
   * @memberof AssetTradeIdentifiableTransaction
   */
  fees?: Array<TransactionFeeItemWithEntryId> | null;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof AssetTradeIdentifiableTransaction
   */
  incoming_entry: TransactionEntryWithEntryId;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof AssetTradeIdentifiableTransaction
   */
  outgoing_entry: TransactionEntryWithEntryId;
  /**
   * Id representing the full transaction.
   * @type {string}
   * @memberof AssetTradeIdentifiableTransaction
   */
  transaction_id: string | null;
  /**
   *
   * @type {string}
   * @memberof AssetTradeIdentifiableTransaction
   */
  type: AssetTradeIdentifiableTransactionTypeEnum;
}

export const AssetTradeIdentifiableTransactionTypeEnum = {
  AssetTrade: "asset_trade",
} as const;

export type AssetTradeIdentifiableTransactionTypeEnum =
  (typeof AssetTradeIdentifiableTransactionTypeEnum)[keyof typeof AssetTradeIdentifiableTransactionTypeEnum];

/**
 *
 * @export
 * @interface AssetTradeRequiredIdentifiableTransaction
 */
export interface AssetTradeRequiredIdentifiableTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetTradeRequiredIdentifiableTransaction
   */
  date: number;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithRequiredEntryId>}
   * @memberof AssetTradeRequiredIdentifiableTransaction
   */
  fees?: Array<TransactionFeeItemWithRequiredEntryId> | null;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof AssetTradeRequiredIdentifiableTransaction
   */
  incoming_entry: TransactionEntryWithRequiredEntryId;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof AssetTradeRequiredIdentifiableTransaction
   */
  outgoing_entry: TransactionEntryWithRequiredEntryId;
  /**
   * Id representing the full transaction.
   * @type {string}
   * @memberof AssetTradeRequiredIdentifiableTransaction
   */
  transaction_id: string;
  /**
   *
   * @type {string}
   * @memberof AssetTradeRequiredIdentifiableTransaction
   */
  type: AssetTradeRequiredIdentifiableTransactionTypeEnum;
}

export const AssetTradeRequiredIdentifiableTransactionTypeEnum = {
  AssetTrade: "asset_trade",
} as const;

export type AssetTradeRequiredIdentifiableTransactionTypeEnum =
  (typeof AssetTradeRequiredIdentifiableTransactionTypeEnum)[keyof typeof AssetTradeRequiredIdentifiableTransactionTypeEnum];

/**
 *
 * @export
 * @interface AssetTradeRequiredTransaction
 */
export interface AssetTradeRequiredTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetTradeRequiredTransaction
   */
  date: number;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithRequiredEntryId>}
   * @memberof AssetTradeRequiredTransaction
   */
  fees?: Array<TransactionFeeItemWithRequiredEntryId> | null;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof AssetTradeRequiredTransaction
   */
  incoming_entry: TransactionEntryWithRequiredEntryId;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof AssetTradeRequiredTransaction
   */
  outgoing_entry: TransactionEntryWithRequiredEntryId;
  /**
   *
   * @type {string}
   * @memberof AssetTradeRequiredTransaction
   */
  type: AssetTradeRequiredTransactionTypeEnum;
}

export const AssetTradeRequiredTransactionTypeEnum = {
  AssetTrade: "asset_trade",
} as const;

export type AssetTradeRequiredTransactionTypeEnum =
  (typeof AssetTradeRequiredTransactionTypeEnum)[keyof typeof AssetTradeRequiredTransactionTypeEnum];

/**
 *
 * @export
 * @interface AssetTradeTransactionInput
 */
export interface AssetTradeTransactionInput {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetTradeTransactionInput
   */
  date: number;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItem>}
   * @memberof AssetTradeTransactionInput
   */
  fees?: Array<TransactionFeeItem> | null;
  /**
   *
   * @type {TransactionEntry}
   * @memberof AssetTradeTransactionInput
   */
  incoming_entry: TransactionEntry;
  /**
   *
   * @type {TransactionEntry}
   * @memberof AssetTradeTransactionInput
   */
  outgoing_entry: TransactionEntry;
  /**
   *
   * @type {string}
   * @memberof AssetTradeTransactionInput
   */
  type: AssetTradeTransactionInputTypeEnum;
}

export const AssetTradeTransactionInputTypeEnum = {
  AssetTrade: "asset_trade",
} as const;

export type AssetTradeTransactionInputTypeEnum =
  (typeof AssetTradeTransactionInputTypeEnum)[keyof typeof AssetTradeTransactionInputTypeEnum];

/**
 *
 * @export
 * @interface AssetTradeTransactionWithEntryIds
 */
export interface AssetTradeTransactionWithEntryIds {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetTradeTransactionWithEntryIds
   */
  date: number;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithEntryId>}
   * @memberof AssetTradeTransactionWithEntryIds
   */
  fees?: Array<TransactionFeeItemWithEntryId> | null;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof AssetTradeTransactionWithEntryIds
   */
  incoming_entry: TransactionEntryWithEntryId;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof AssetTradeTransactionWithEntryIds
   */
  outgoing_entry: TransactionEntryWithEntryId;
  /**
   *
   * @type {string}
   * @memberof AssetTradeTransactionWithEntryIds
   */
  type: AssetTradeTransactionWithEntryIdsTypeEnum;
}

export const AssetTradeTransactionWithEntryIdsTypeEnum = {
  AssetTrade: "asset_trade",
} as const;

export type AssetTradeTransactionWithEntryIdsTypeEnum =
  (typeof AssetTradeTransactionWithEntryIdsTypeEnum)[keyof typeof AssetTradeTransactionWithEntryIdsTypeEnum];

/**
 *
 * @export
 * @interface AssetTransferInIdentifiableTransaction
 */
export interface AssetTransferInIdentifiableTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetTransferInIdentifiableTransaction
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof AssetTransferInIdentifiableTransaction
   */
  entry: TransactionEntryWithEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithEntryId>}
   * @memberof AssetTransferInIdentifiableTransaction
   */
  fees?: Array<TransactionFeeItemWithEntryId> | null;
  /**
   * Id representing the full transaction.
   * @type {string}
   * @memberof AssetTransferInIdentifiableTransaction
   */
  transaction_id: string | null;
  /**
   *
   * @type {string}
   * @memberof AssetTransferInIdentifiableTransaction
   */
  type: AssetTransferInIdentifiableTransactionTypeEnum;
}

export const AssetTransferInIdentifiableTransactionTypeEnum = {
  AssetTransferIn: "asset_transfer_in",
} as const;

export type AssetTransferInIdentifiableTransactionTypeEnum =
  (typeof AssetTransferInIdentifiableTransactionTypeEnum)[keyof typeof AssetTransferInIdentifiableTransactionTypeEnum];

/**
 *
 * @export
 * @interface AssetTransferInRequiredIdentifiableTransaction
 */
export interface AssetTransferInRequiredIdentifiableTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetTransferInRequiredIdentifiableTransaction
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof AssetTransferInRequiredIdentifiableTransaction
   */
  entry: TransactionEntryWithRequiredEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithRequiredEntryId>}
   * @memberof AssetTransferInRequiredIdentifiableTransaction
   */
  fees?: Array<TransactionFeeItemWithRequiredEntryId> | null;
  /**
   * Id representing the full transaction.
   * @type {string}
   * @memberof AssetTransferInRequiredIdentifiableTransaction
   */
  transaction_id: string;
  /**
   *
   * @type {string}
   * @memberof AssetTransferInRequiredIdentifiableTransaction
   */
  type: AssetTransferInRequiredIdentifiableTransactionTypeEnum;
}

export const AssetTransferInRequiredIdentifiableTransactionTypeEnum = {
  AssetTransferIn: "asset_transfer_in",
} as const;

export type AssetTransferInRequiredIdentifiableTransactionTypeEnum =
  (typeof AssetTransferInRequiredIdentifiableTransactionTypeEnum)[keyof typeof AssetTransferInRequiredIdentifiableTransactionTypeEnum];

/**
 *
 * @export
 * @interface AssetTransferInRequiredTransaction
 */
export interface AssetTransferInRequiredTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetTransferInRequiredTransaction
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof AssetTransferInRequiredTransaction
   */
  entry: TransactionEntryWithRequiredEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithRequiredEntryId>}
   * @memberof AssetTransferInRequiredTransaction
   */
  fees?: Array<TransactionFeeItemWithRequiredEntryId> | null;
  /**
   *
   * @type {string}
   * @memberof AssetTransferInRequiredTransaction
   */
  type: AssetTransferInRequiredTransactionTypeEnum;
}

export const AssetTransferInRequiredTransactionTypeEnum = {
  AssetTransferIn: "asset_transfer_in",
} as const;

export type AssetTransferInRequiredTransactionTypeEnum =
  (typeof AssetTransferInRequiredTransactionTypeEnum)[keyof typeof AssetTransferInRequiredTransactionTypeEnum];

/**
 *
 * @export
 * @interface AssetTransferInTransactionInput
 */
export interface AssetTransferInTransactionInput {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetTransferInTransactionInput
   */
  date: number;
  /**
   *
   * @type {TransactionEntry}
   * @memberof AssetTransferInTransactionInput
   */
  entry: TransactionEntry;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItem>}
   * @memberof AssetTransferInTransactionInput
   */
  fees?: Array<TransactionFeeItem> | null;
  /**
   *
   * @type {string}
   * @memberof AssetTransferInTransactionInput
   */
  type: AssetTransferInTransactionInputTypeEnum;
}

export const AssetTransferInTransactionInputTypeEnum = {
  AssetTransferIn: "asset_transfer_in",
} as const;

export type AssetTransferInTransactionInputTypeEnum =
  (typeof AssetTransferInTransactionInputTypeEnum)[keyof typeof AssetTransferInTransactionInputTypeEnum];

/**
 *
 * @export
 * @interface AssetTransferInTransactionWithEntryIds
 */
export interface AssetTransferInTransactionWithEntryIds {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetTransferInTransactionWithEntryIds
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof AssetTransferInTransactionWithEntryIds
   */
  entry: TransactionEntryWithEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithEntryId>}
   * @memberof AssetTransferInTransactionWithEntryIds
   */
  fees?: Array<TransactionFeeItemWithEntryId> | null;
  /**
   *
   * @type {string}
   * @memberof AssetTransferInTransactionWithEntryIds
   */
  type: AssetTransferInTransactionWithEntryIdsTypeEnum;
}

export const AssetTransferInTransactionWithEntryIdsTypeEnum = {
  AssetTransferIn: "asset_transfer_in",
} as const;

export type AssetTransferInTransactionWithEntryIdsTypeEnum =
  (typeof AssetTransferInTransactionWithEntryIdsTypeEnum)[keyof typeof AssetTransferInTransactionWithEntryIdsTypeEnum];

/**
 *
 * @export
 * @interface AssetTransferOutIdentifiableTransaction
 */
export interface AssetTransferOutIdentifiableTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetTransferOutIdentifiableTransaction
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof AssetTransferOutIdentifiableTransaction
   */
  entry: TransactionEntryWithEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithEntryId>}
   * @memberof AssetTransferOutIdentifiableTransaction
   */
  fees?: Array<TransactionFeeItemWithEntryId> | null;
  /**
   * Id representing the full transaction.
   * @type {string}
   * @memberof AssetTransferOutIdentifiableTransaction
   */
  transaction_id: string | null;
  /**
   *
   * @type {string}
   * @memberof AssetTransferOutIdentifiableTransaction
   */
  type: AssetTransferOutIdentifiableTransactionTypeEnum;
}

export const AssetTransferOutIdentifiableTransactionTypeEnum = {
  AssetTransferOut: "asset_transfer_out",
} as const;

export type AssetTransferOutIdentifiableTransactionTypeEnum =
  (typeof AssetTransferOutIdentifiableTransactionTypeEnum)[keyof typeof AssetTransferOutIdentifiableTransactionTypeEnum];

/**
 *
 * @export
 * @interface AssetTransferOutRequiredIdentifiableTransaction
 */
export interface AssetTransferOutRequiredIdentifiableTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetTransferOutRequiredIdentifiableTransaction
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof AssetTransferOutRequiredIdentifiableTransaction
   */
  entry: TransactionEntryWithRequiredEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithRequiredEntryId>}
   * @memberof AssetTransferOutRequiredIdentifiableTransaction
   */
  fees?: Array<TransactionFeeItemWithRequiredEntryId> | null;
  /**
   * Id representing the full transaction.
   * @type {string}
   * @memberof AssetTransferOutRequiredIdentifiableTransaction
   */
  transaction_id: string;
  /**
   *
   * @type {string}
   * @memberof AssetTransferOutRequiredIdentifiableTransaction
   */
  type: AssetTransferOutRequiredIdentifiableTransactionTypeEnum;
}

export const AssetTransferOutRequiredIdentifiableTransactionTypeEnum = {
  AssetTransferOut: "asset_transfer_out",
} as const;

export type AssetTransferOutRequiredIdentifiableTransactionTypeEnum =
  (typeof AssetTransferOutRequiredIdentifiableTransactionTypeEnum)[keyof typeof AssetTransferOutRequiredIdentifiableTransactionTypeEnum];

/**
 *
 * @export
 * @interface AssetTransferOutRequiredTransaction
 */
export interface AssetTransferOutRequiredTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetTransferOutRequiredTransaction
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof AssetTransferOutRequiredTransaction
   */
  entry: TransactionEntryWithRequiredEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithRequiredEntryId>}
   * @memberof AssetTransferOutRequiredTransaction
   */
  fees?: Array<TransactionFeeItemWithRequiredEntryId> | null;
  /**
   *
   * @type {string}
   * @memberof AssetTransferOutRequiredTransaction
   */
  type: AssetTransferOutRequiredTransactionTypeEnum;
}

export const AssetTransferOutRequiredTransactionTypeEnum = {
  AssetTransferOut: "asset_transfer_out",
} as const;

export type AssetTransferOutRequiredTransactionTypeEnum =
  (typeof AssetTransferOutRequiredTransactionTypeEnum)[keyof typeof AssetTransferOutRequiredTransactionTypeEnum];

/**
 *
 * @export
 * @interface AssetTransferOutTransactionInput
 */
export interface AssetTransferOutTransactionInput {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetTransferOutTransactionInput
   */
  date: number;
  /**
   *
   * @type {TransactionEntry}
   * @memberof AssetTransferOutTransactionInput
   */
  entry: TransactionEntry;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItem>}
   * @memberof AssetTransferOutTransactionInput
   */
  fees?: Array<TransactionFeeItem> | null;
  /**
   *
   * @type {string}
   * @memberof AssetTransferOutTransactionInput
   */
  type: AssetTransferOutTransactionInputTypeEnum;
}

export const AssetTransferOutTransactionInputTypeEnum = {
  AssetTransferOut: "asset_transfer_out",
} as const;

export type AssetTransferOutTransactionInputTypeEnum =
  (typeof AssetTransferOutTransactionInputTypeEnum)[keyof typeof AssetTransferOutTransactionInputTypeEnum];

/**
 *
 * @export
 * @interface AssetTransferOutTransactionWithEntryIds
 */
export interface AssetTransferOutTransactionWithEntryIds {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof AssetTransferOutTransactionWithEntryIds
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof AssetTransferOutTransactionWithEntryIds
   */
  entry: TransactionEntryWithEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithEntryId>}
   * @memberof AssetTransferOutTransactionWithEntryIds
   */
  fees?: Array<TransactionFeeItemWithEntryId> | null;
  /**
   *
   * @type {string}
   * @memberof AssetTransferOutTransactionWithEntryIds
   */
  type: AssetTransferOutTransactionWithEntryIdsTypeEnum;
}

export const AssetTransferOutTransactionWithEntryIdsTypeEnum = {
  AssetTransferOut: "asset_transfer_out",
} as const;

export type AssetTransferOutTransactionWithEntryIdsTypeEnum =
  (typeof AssetTransferOutTransactionWithEntryIdsTypeEnum)[keyof typeof AssetTransferOutTransactionWithEntryIdsTypeEnum];

/**
 *
 * @export
 * @interface AssetsPage
 */
export interface AssetsPage {
  /**
   * The lookup tables for the results
   * @type {AssetLookupTables}
   * @memberof AssetsPage
   */
  lookup_tables: AssetLookupTables;
  /**
   * One page of results
   * @type {Array<AssetAssetRequiredAssetTypeIdWithId>}
   * @memberof AssetsPage
   */
  results: Array<AssetAssetRequiredAssetTypeIdWithId>;
  /**
   * The total number of results available
   * @type {number}
   * @memberof AssetsPage
   */
  total_results: number;
}
/**
 *
 * @export
 * @interface Auth
 */
export interface Auth {
  /**
   * The JWT bearer authentication token.
   * @type {string}
   * @memberof Auth
   */
  token: string;
}
/**
 *
 * @export
 * @interface AuthMe
 */
export interface AuthMe {
  /**
   *
   * @type {number}
   * @memberof AuthMe
   */
  default_asset_id: number;
  /**
   *
   * @type {string}
   * @memberof AuthMe
   */
  role: string;
  /**
   *
   * @type {string}
   * @memberof AuthMe
   */
  user_id: string;
  /**
   *
   * @type {UserMetadata}
   * @memberof AuthMe
   */
  user_metadata?: UserMetadata | null;
}
/**
 *
 * @export
 * @interface CashDividendIdentifiableTransaction
 */
export interface CashDividendIdentifiableTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof CashDividendIdentifiableTransaction
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof CashDividendIdentifiableTransaction
   */
  entry: TransactionEntryWithEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithEntryId>}
   * @memberof CashDividendIdentifiableTransaction
   */
  fees?: Array<TransactionFeeItemWithEntryId> | null;
  /**
   * An id of a cash asset for which the dividends were paid for.
   * @type {number}
   * @memberof CashDividendIdentifiableTransaction
   */
  origin_asset_id: number;
  /**
   * Id representing the full transaction.
   * @type {string}
   * @memberof CashDividendIdentifiableTransaction
   */
  transaction_id: string | null;
  /**
   *
   * @type {string}
   * @memberof CashDividendIdentifiableTransaction
   */
  type: CashDividendIdentifiableTransactionTypeEnum;
}

export const CashDividendIdentifiableTransactionTypeEnum = {
  CashDividend: "cash_dividend",
} as const;

export type CashDividendIdentifiableTransactionTypeEnum =
  (typeof CashDividendIdentifiableTransactionTypeEnum)[keyof typeof CashDividendIdentifiableTransactionTypeEnum];

/**
 *
 * @export
 * @interface CashDividendRequiredIdentifiableTransaction
 */
export interface CashDividendRequiredIdentifiableTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof CashDividendRequiredIdentifiableTransaction
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof CashDividendRequiredIdentifiableTransaction
   */
  entry: TransactionEntryWithRequiredEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithRequiredEntryId>}
   * @memberof CashDividendRequiredIdentifiableTransaction
   */
  fees?: Array<TransactionFeeItemWithRequiredEntryId> | null;
  /**
   * An id of a cash asset for which the dividends were paid for.
   * @type {number}
   * @memberof CashDividendRequiredIdentifiableTransaction
   */
  origin_asset_id: number;
  /**
   * Id representing the full transaction.
   * @type {string}
   * @memberof CashDividendRequiredIdentifiableTransaction
   */
  transaction_id: string;
  /**
   *
   * @type {string}
   * @memberof CashDividendRequiredIdentifiableTransaction
   */
  type: CashDividendRequiredIdentifiableTransactionTypeEnum;
}

export const CashDividendRequiredIdentifiableTransactionTypeEnum = {
  CashDividend: "cash_dividend",
} as const;

export type CashDividendRequiredIdentifiableTransactionTypeEnum =
  (typeof CashDividendRequiredIdentifiableTransactionTypeEnum)[keyof typeof CashDividendRequiredIdentifiableTransactionTypeEnum];

/**
 *
 * @export
 * @interface CashDividendRequiredTransaction
 */
export interface CashDividendRequiredTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof CashDividendRequiredTransaction
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof CashDividendRequiredTransaction
   */
  entry: TransactionEntryWithRequiredEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithRequiredEntryId>}
   * @memberof CashDividendRequiredTransaction
   */
  fees?: Array<TransactionFeeItemWithRequiredEntryId> | null;
  /**
   * An id of a cash asset for which the dividends were paid for.
   * @type {number}
   * @memberof CashDividendRequiredTransaction
   */
  origin_asset_id: number;
  /**
   *
   * @type {string}
   * @memberof CashDividendRequiredTransaction
   */
  type: CashDividendRequiredTransactionTypeEnum;
}

export const CashDividendRequiredTransactionTypeEnum = {
  CashDividend: "cash_dividend",
} as const;

export type CashDividendRequiredTransactionTypeEnum =
  (typeof CashDividendRequiredTransactionTypeEnum)[keyof typeof CashDividendRequiredTransactionTypeEnum];

/**
 *
 * @export
 * @interface CashDividendTransactionInput
 */
export interface CashDividendTransactionInput {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof CashDividendTransactionInput
   */
  date: number;
  /**
   *
   * @type {TransactionEntry}
   * @memberof CashDividendTransactionInput
   */
  entry: TransactionEntry;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItem>}
   * @memberof CashDividendTransactionInput
   */
  fees?: Array<TransactionFeeItem> | null;
  /**
   * An id of a cash asset for which the dividends were paid for.
   * @type {number}
   * @memberof CashDividendTransactionInput
   */
  origin_asset_id: number;
  /**
   *
   * @type {string}
   * @memberof CashDividendTransactionInput
   */
  type: CashDividendTransactionInputTypeEnum;
}

export const CashDividendTransactionInputTypeEnum = {
  CashDividend: "cash_dividend",
} as const;

export type CashDividendTransactionInputTypeEnum =
  (typeof CashDividendTransactionInputTypeEnum)[keyof typeof CashDividendTransactionInputTypeEnum];

/**
 *
 * @export
 * @interface CashDividendTransactionWithEntryIds
 */
export interface CashDividendTransactionWithEntryIds {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof CashDividendTransactionWithEntryIds
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof CashDividendTransactionWithEntryIds
   */
  entry: TransactionEntryWithEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithEntryId>}
   * @memberof CashDividendTransactionWithEntryIds
   */
  fees?: Array<TransactionFeeItemWithEntryId> | null;
  /**
   * An id of a cash asset for which the dividends were paid for.
   * @type {number}
   * @memberof CashDividendTransactionWithEntryIds
   */
  origin_asset_id: number;
  /**
   *
   * @type {string}
   * @memberof CashDividendTransactionWithEntryIds
   */
  type: CashDividendTransactionWithEntryIdsTypeEnum;
}

export const CashDividendTransactionWithEntryIdsTypeEnum = {
  CashDividend: "cash_dividend",
} as const;

export type CashDividendTransactionWithEntryIdsTypeEnum =
  (typeof CashDividendTransactionWithEntryIdsTypeEnum)[keyof typeof CashDividendTransactionWithEntryIdsTypeEnum];

/**
 *
 * @export
 * @interface CashPortfolio
 */
export interface CashPortfolio {
  /**
   *
   * @type {string}
   * @memberof CashPortfolio
   */
  account_id: string;
  /**
   *
   * @type {number}
   * @memberof CashPortfolio
   */
  asset_id: number;
  /**
   *
   * @type {number}
   * @memberof CashPortfolio
   */
  dividends: number;
  /**
   *
   * @type {number}
   * @memberof CashPortfolio
   */
  fees: number;
  /**
   *
   * @type {number}
   * @memberof CashPortfolio
   */
  units: number;
}
/**
 *
 * @export
 * @interface CashTransferInIdentifiableTransaction
 */
export interface CashTransferInIdentifiableTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof CashTransferInIdentifiableTransaction
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof CashTransferInIdentifiableTransaction
   */
  entry: TransactionEntryWithEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithEntryId>}
   * @memberof CashTransferInIdentifiableTransaction
   */
  fees?: Array<TransactionFeeItemWithEntryId> | null;
  /**
   * Id representing the full transaction.
   * @type {string}
   * @memberof CashTransferInIdentifiableTransaction
   */
  transaction_id: string | null;
  /**
   *
   * @type {string}
   * @memberof CashTransferInIdentifiableTransaction
   */
  type: CashTransferInIdentifiableTransactionTypeEnum;
}

export const CashTransferInIdentifiableTransactionTypeEnum = {
  CashTransferIn: "cash_transfer_in",
} as const;

export type CashTransferInIdentifiableTransactionTypeEnum =
  (typeof CashTransferInIdentifiableTransactionTypeEnum)[keyof typeof CashTransferInIdentifiableTransactionTypeEnum];

/**
 *
 * @export
 * @interface CashTransferInRequiredIdentifiableTransaction
 */
export interface CashTransferInRequiredIdentifiableTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof CashTransferInRequiredIdentifiableTransaction
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof CashTransferInRequiredIdentifiableTransaction
   */
  entry: TransactionEntryWithRequiredEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithRequiredEntryId>}
   * @memberof CashTransferInRequiredIdentifiableTransaction
   */
  fees?: Array<TransactionFeeItemWithRequiredEntryId> | null;
  /**
   * Id representing the full transaction.
   * @type {string}
   * @memberof CashTransferInRequiredIdentifiableTransaction
   */
  transaction_id: string;
  /**
   *
   * @type {string}
   * @memberof CashTransferInRequiredIdentifiableTransaction
   */
  type: CashTransferInRequiredIdentifiableTransactionTypeEnum;
}

export const CashTransferInRequiredIdentifiableTransactionTypeEnum = {
  CashTransferIn: "cash_transfer_in",
} as const;

export type CashTransferInRequiredIdentifiableTransactionTypeEnum =
  (typeof CashTransferInRequiredIdentifiableTransactionTypeEnum)[keyof typeof CashTransferInRequiredIdentifiableTransactionTypeEnum];

/**
 *
 * @export
 * @interface CashTransferInRequiredTransaction
 */
export interface CashTransferInRequiredTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof CashTransferInRequiredTransaction
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof CashTransferInRequiredTransaction
   */
  entry: TransactionEntryWithRequiredEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithRequiredEntryId>}
   * @memberof CashTransferInRequiredTransaction
   */
  fees?: Array<TransactionFeeItemWithRequiredEntryId> | null;
  /**
   *
   * @type {string}
   * @memberof CashTransferInRequiredTransaction
   */
  type: CashTransferInRequiredTransactionTypeEnum;
}

export const CashTransferInRequiredTransactionTypeEnum = {
  CashTransferIn: "cash_transfer_in",
} as const;

export type CashTransferInRequiredTransactionTypeEnum =
  (typeof CashTransferInRequiredTransactionTypeEnum)[keyof typeof CashTransferInRequiredTransactionTypeEnum];

/**
 *
 * @export
 * @interface CashTransferInTransactionInput
 */
export interface CashTransferInTransactionInput {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof CashTransferInTransactionInput
   */
  date: number;
  /**
   *
   * @type {TransactionEntry}
   * @memberof CashTransferInTransactionInput
   */
  entry: TransactionEntry;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItem>}
   * @memberof CashTransferInTransactionInput
   */
  fees?: Array<TransactionFeeItem> | null;
  /**
   *
   * @type {string}
   * @memberof CashTransferInTransactionInput
   */
  type: CashTransferInTransactionInputTypeEnum;
}

export const CashTransferInTransactionInputTypeEnum = {
  CashTransferIn: "cash_transfer_in",
} as const;

export type CashTransferInTransactionInputTypeEnum =
  (typeof CashTransferInTransactionInputTypeEnum)[keyof typeof CashTransferInTransactionInputTypeEnum];

/**
 *
 * @export
 * @interface CashTransferInTransactionWithEntryIds
 */
export interface CashTransferInTransactionWithEntryIds {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof CashTransferInTransactionWithEntryIds
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof CashTransferInTransactionWithEntryIds
   */
  entry: TransactionEntryWithEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithEntryId>}
   * @memberof CashTransferInTransactionWithEntryIds
   */
  fees?: Array<TransactionFeeItemWithEntryId> | null;
  /**
   *
   * @type {string}
   * @memberof CashTransferInTransactionWithEntryIds
   */
  type: CashTransferInTransactionWithEntryIdsTypeEnum;
}

export const CashTransferInTransactionWithEntryIdsTypeEnum = {
  CashTransferIn: "cash_transfer_in",
} as const;

export type CashTransferInTransactionWithEntryIdsTypeEnum =
  (typeof CashTransferInTransactionWithEntryIdsTypeEnum)[keyof typeof CashTransferInTransactionWithEntryIdsTypeEnum];

/**
 *
 * @export
 * @interface CashTransferOutIdentifiableTransaction
 */
export interface CashTransferOutIdentifiableTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof CashTransferOutIdentifiableTransaction
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof CashTransferOutIdentifiableTransaction
   */
  entry: TransactionEntryWithEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithEntryId>}
   * @memberof CashTransferOutIdentifiableTransaction
   */
  fees?: Array<TransactionFeeItemWithEntryId> | null;
  /**
   * Id representing the full transaction.
   * @type {string}
   * @memberof CashTransferOutIdentifiableTransaction
   */
  transaction_id: string | null;
  /**
   *
   * @type {string}
   * @memberof CashTransferOutIdentifiableTransaction
   */
  type: CashTransferOutIdentifiableTransactionTypeEnum;
}

export const CashTransferOutIdentifiableTransactionTypeEnum = {
  CashTransferOut: "cash_transfer_out",
} as const;

export type CashTransferOutIdentifiableTransactionTypeEnum =
  (typeof CashTransferOutIdentifiableTransactionTypeEnum)[keyof typeof CashTransferOutIdentifiableTransactionTypeEnum];

/**
 *
 * @export
 * @interface CashTransferOutRequiredIdentifiableTransaction
 */
export interface CashTransferOutRequiredIdentifiableTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof CashTransferOutRequiredIdentifiableTransaction
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof CashTransferOutRequiredIdentifiableTransaction
   */
  entry: TransactionEntryWithRequiredEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithRequiredEntryId>}
   * @memberof CashTransferOutRequiredIdentifiableTransaction
   */
  fees?: Array<TransactionFeeItemWithRequiredEntryId> | null;
  /**
   * Id representing the full transaction.
   * @type {string}
   * @memberof CashTransferOutRequiredIdentifiableTransaction
   */
  transaction_id: string;
  /**
   *
   * @type {string}
   * @memberof CashTransferOutRequiredIdentifiableTransaction
   */
  type: CashTransferOutRequiredIdentifiableTransactionTypeEnum;
}

export const CashTransferOutRequiredIdentifiableTransactionTypeEnum = {
  CashTransferOut: "cash_transfer_out",
} as const;

export type CashTransferOutRequiredIdentifiableTransactionTypeEnum =
  (typeof CashTransferOutRequiredIdentifiableTransactionTypeEnum)[keyof typeof CashTransferOutRequiredIdentifiableTransactionTypeEnum];

/**
 *
 * @export
 * @interface CashTransferOutRequiredTransaction
 */
export interface CashTransferOutRequiredTransaction {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof CashTransferOutRequiredTransaction
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof CashTransferOutRequiredTransaction
   */
  entry: TransactionEntryWithRequiredEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithRequiredEntryId>}
   * @memberof CashTransferOutRequiredTransaction
   */
  fees?: Array<TransactionFeeItemWithRequiredEntryId> | null;
  /**
   *
   * @type {string}
   * @memberof CashTransferOutRequiredTransaction
   */
  type: CashTransferOutRequiredTransactionTypeEnum;
}

export const CashTransferOutRequiredTransactionTypeEnum = {
  CashTransferOut: "cash_transfer_out",
} as const;

export type CashTransferOutRequiredTransactionTypeEnum =
  (typeof CashTransferOutRequiredTransactionTypeEnum)[keyof typeof CashTransferOutRequiredTransactionTypeEnum];

/**
 *
 * @export
 * @interface CashTransferOutTransactionInput
 */
export interface CashTransferOutTransactionInput {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof CashTransferOutTransactionInput
   */
  date: number;
  /**
   *
   * @type {TransactionEntry}
   * @memberof CashTransferOutTransactionInput
   */
  entry: TransactionEntry;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItem>}
   * @memberof CashTransferOutTransactionInput
   */
  fees?: Array<TransactionFeeItem> | null;
  /**
   *
   * @type {string}
   * @memberof CashTransferOutTransactionInput
   */
  type: CashTransferOutTransactionInputTypeEnum;
}

export const CashTransferOutTransactionInputTypeEnum = {
  CashTransferOut: "cash_transfer_out",
} as const;

export type CashTransferOutTransactionInputTypeEnum =
  (typeof CashTransferOutTransactionInputTypeEnum)[keyof typeof CashTransferOutTransactionInputTypeEnum];

/**
 *
 * @export
 * @interface CashTransferOutTransactionWithEntryIds
 */
export interface CashTransferOutTransactionWithEntryIds {
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof CashTransferOutTransactionWithEntryIds
   */
  date: number;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof CashTransferOutTransactionWithEntryIds
   */
  entry: TransactionEntryWithEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithEntryId>}
   * @memberof CashTransferOutTransactionWithEntryIds
   */
  fees?: Array<TransactionFeeItemWithEntryId> | null;
  /**
   *
   * @type {string}
   * @memberof CashTransferOutTransactionWithEntryIds
   */
  type: CashTransferOutTransactionWithEntryIdsTypeEnum;
}

export const CashTransferOutTransactionWithEntryIdsTypeEnum = {
  CashTransferOut: "cash_transfer_out",
} as const;

export type CashTransferOutTransactionWithEntryIdsTypeEnum =
  (typeof CashTransferOutTransactionWithEntryIdsTypeEnum)[keyof typeof CashTransferOutTransactionWithEntryIdsTypeEnum];

/**
 *
 * @export
 * @interface CategoryIdentifiableCategoryType
 */
export interface CategoryIdentifiableCategoryType {
  /**
   * Category name
   * @type {string}
   * @memberof CategoryIdentifiableCategoryType
   */
  category: string;
  /**
   * Category type (generic - can be ID or expanded)
   * @type {IdentifiableCategoryType}
   * @memberof CategoryIdentifiableCategoryType
   */
  category_type: IdentifiableCategoryType;
  /**
   * Icon identifier for the category
   * @type {string}
   * @memberof CategoryIdentifiableCategoryType
   */
  icon: string;
  /**
   * Whether this is a global category available to all users
   * @type {boolean}
   * @memberof CategoryIdentifiableCategoryType
   */
  is_global: boolean;
  /**
   * Whether this is a system category that cannot be modified
   * @type {boolean}
   * @memberof CategoryIdentifiableCategoryType
   */
  is_system: boolean;
}
/**
 *
 * @export
 * @interface CategoryMetadataLookupTables
 */
export interface CategoryMetadataLookupTables {
  /**
   *
   * @type {Array<IdentifiableCategoryType>}
   * @memberof CategoryMetadataLookupTables
   */
  category_types: Array<IdentifiableCategoryType>;
}
/**
 *
 * @export
 * @interface CategoryRequiredCategoryTypeIdWithId
 */
export interface CategoryRequiredCategoryTypeIdWithId {
  /**
   * Category name
   * @type {string}
   * @memberof CategoryRequiredCategoryTypeIdWithId
   */
  category: string;
  /**
   * Category type (generic - can be ID or expanded)
   * @type {number}
   * @memberof CategoryRequiredCategoryTypeIdWithId
   */
  category_type: number;
  /**
   * Icon identifier for the category
   * @type {string}
   * @memberof CategoryRequiredCategoryTypeIdWithId
   */
  icon: string;
  /**
   * Unique identifier for the category
   * @type {number}
   * @memberof CategoryRequiredCategoryTypeIdWithId
   */
  id: number;
  /**
   * Whether this is a global category available to all users
   * @type {boolean}
   * @memberof CategoryRequiredCategoryTypeIdWithId
   */
  is_global: boolean;
  /**
   * Whether this is a system category that cannot be modified
   * @type {boolean}
   * @memberof CategoryRequiredCategoryTypeIdWithId
   */
  is_system: boolean;
}
/**
 *
 * @export
 * @interface CategoryType
 */
export interface CategoryType {
  /**
   * Whether this is a global type
   * @type {boolean}
   * @memberof CategoryType
   */
  is_global: boolean;
  /**
   * The name of the category type
   * @type {string}
   * @memberof CategoryType
   */
  name: string;
}
/**
 * @type CombinedTransactionItem
 * @export
 */
export type CombinedTransactionItem =
  | GroupTransactionItem
  | IndividualTransactionItem;

/**
 *
 * @export
 * @interface CombinedTransactionsPage
 */
export interface CombinedTransactionsPage {
  /**
   *
   * @type {boolean}
   * @memberof CombinedTransactionsPage
   */
  has_more: boolean;
  /**
   *
   * @type {MetadataLookupTables}
   * @memberof CombinedTransactionsPage
   */
  lookup_tables: MetadataLookupTables;
  /**
   *
   * @type {string}
   * @memberof CombinedTransactionsPage
   */
  next_cursor?: string | null;
  /**
   *
   * @type {Array<CombinedTransactionItem>}
   * @memberof CombinedTransactionsPage
   */
  results: Array<CombinedTransactionItem>;
  /**
   *
   * @type {number}
   * @memberof CombinedTransactionsPage
   */
  total_results?: number | null;
}
/**
 *
 * @export
 * @interface ConfirmFileResponse
 */
export interface ConfirmFileResponse {
  /**
   *
   * @type {string}
   * @memberof ConfirmFileResponse
   */
  id: string;
  /**
   *
   * @type {string}
   * @memberof ConfirmFileResponse
   */
  status: string;
  /**
   *
   * @type {string}
   * @memberof ConfirmFileResponse
   */
  updated_at: string;
}
/**
 *
 * @export
 * @interface CreateCategoryRequest
 */
export interface CreateCategoryRequest {
  /**
   * Category name
   * @type {string}
   * @memberof CreateCategoryRequest
   */
  category: string;
  /**
   * Category type ID
   * @type {number}
   * @memberof CreateCategoryRequest
   */
  category_type_id: number;
  /**
   * Icon identifier
   * @type {string}
   * @memberof CreateCategoryRequest
   */
  icon: string;
}
/**
 *
 * @export
 * @interface CreateCategoryTypeRequest
 */
export interface CreateCategoryTypeRequest {
  /**
   * Category type name
   * @type {string}
   * @memberof CreateCategoryTypeRequest
   */
  name: string;
}
/**
 *
 * @export
 * @interface CreateFileRequest
 */
export interface CreateFileRequest {
  /**
   * MIME type. Must be non-empty, contain exactly one \'/\', and not include parameters.
   * @type {string}
   * @memberof CreateFileRequest
   */
  mime_type: string;
  /**
   * Original file name. Must be 1-255 characters and must not contain path separators.
   * @type {string}
   * @memberof CreateFileRequest
   */
  original_name: string;
  /**
   * File size in bytes. Must be between 1 and 20 MB (20,971,520 bytes).
   * @type {number}
   * @memberof CreateFileRequest
   */
  size_bytes: number;
}
/**
 *
 * @export
 * @interface CreateFileResponse
 */
export interface CreateFileResponse {
  /**
   *
   * @type {string}
   * @memberof CreateFileResponse
   */
  created_at: string;
  /**
   *
   * @type {boolean}
   * @memberof CreateFileResponse
   */
  has_thumbnail: boolean;
  /**
   *
   * @type {string}
   * @memberof CreateFileResponse
   */
  id: string;
  /**
   *
   * @type {string}
   * @memberof CreateFileResponse
   */
  mime_type: string;
  /**
   *
   * @type {string}
   * @memberof CreateFileResponse
   */
  original_name: string;
  /**
   *
   * @type {number}
   * @memberof CreateFileResponse
   */
  size_bytes: number;
  /**
   *
   * @type {string}
   * @memberof CreateFileResponse
   */
  status: string;
  /**
   *
   * @type {string}
   * @memberof CreateFileResponse
   */
  updated_at: string;
  /**
   *
   * @type {UploadMetadata}
   * @memberof CreateFileResponse
   */
  upload_metadata: UploadMetadata;
}
/**
 *
 * @export
 * @enum {string}
 */

export const ErrorType = {
  NotFound: "NotFound",
  ValidationError: "ValidationError",
  Unauthorized: "Unauthorized",
  Forbidden: "Forbidden",
  Conflict: "Conflict",
  InternalServerError: "InternalServerError",
  ServiceUnavailable: "ServiceUnavailable",
  RateLimited: "RateLimited",
} as const;

export type ErrorType = (typeof ErrorType)[keyof typeof ErrorType];

/**
 *
 * @export
 * @interface FieldError
 */
export interface FieldError {
  /**
   *
   * @type {string}
   * @memberof FieldError
   */
  field: string;
  /**
   *
   * @type {string}
   * @memberof FieldError
   */
  message: string;
}
/**
 *
 * @export
 * @interface FileUrlResponse
 */
export interface FileUrlResponse {
  /**
   *
   * @type {number}
   * @memberof FileUrlResponse
   */
  expires_in_seconds: number;
  /**
   *
   * @type {string}
   * @memberof FileUrlResponse
   */
  url: string;
}
/**
 *
 * @export
 * @interface GetAccountLiquidityTypesResponse
 */
export interface GetAccountLiquidityTypesResponse {
  /**
   *
   * @type {Array<IdentifiableAccountType>}
   * @memberof GetAccountLiquidityTypesResponse
   */
  account_liquidity_types: Array<IdentifiableAccountType>;
}
/**
 *
 * @export
 * @interface GetAccountResponse
 */
export interface GetAccountResponse {
  /**
   *
   * @type {IdentifiableAccountType}
   * @memberof GetAccountResponse
   */
  account_type: IdentifiableAccountType;
  /**
   *
   * @type {IdentifiableAccountType}
   * @memberof GetAccountResponse
   */
  liquidity_type: IdentifiableAccountType;
  /**
   * Account name
   * @type {string}
   * @memberof GetAccountResponse
   */
  name: string;
  /**
   * Ownership share. Must be > 0 and <= 1.
   * @type {number}
   * @memberof GetAccountResponse
   */
  ownership_share: number;
}
/**
 *
 * @export
 * @interface GetAccountTypesResponse
 */
export interface GetAccountTypesResponse {
  /**
   *
   * @type {Array<IdentifiableAccountType>}
   * @memberof GetAccountTypesResponse
   */
  account_types: Array<IdentifiableAccountType>;
}
/**
 *
 * @export
 * @interface GetAccountsResponse
 */
export interface GetAccountsResponse {
  /**
   *
   * @type {Array<AddAccountResponse>}
   * @memberof GetAccountsResponse
   */
  accounts: Array<AddAccountResponse>;
  /**
   *
   * @type {AccountMetadataLookupTables}
   * @memberof GetAccountsResponse
   */
  lookup_tables: AccountMetadataLookupTables;
}
/**
 *
 * @export
 * @interface GetAssetPairRatesResponse
 */
export interface GetAssetPairRatesResponse {
  /**
   *
   * @type {string}
   * @memberof GetAssetPairRatesResponse
   */
  range: string;
  /**
   *
   * @type {Array<AssetRate>}
   * @memberof GetAssetPairRatesResponse
   */
  rates: Array<AssetRate>;
}
/**
 *
 * @export
 * @interface GetAssetPairResponse
 */
export interface GetAssetPairResponse {
  /**
   *
   * @type {AssetIdentifiableAssetType}
   * @memberof GetAssetPairResponse
   */
  main_asset: AssetIdentifiableAssetType;
  /**
   *
   * @type {SharedAssetPairMetadata}
   * @memberof GetAssetPairResponse
   */
  metadata: SharedAssetPairMetadata;
  /**
   *
   * @type {AssetIdentifiableAssetType}
   * @memberof GetAssetPairResponse
   */
  reference_asset: AssetIdentifiableAssetType;
}
/**
 *
 * @export
 * @interface GetAssetResponse
 */
export interface GetAssetResponse {
  /**
   *
   * @type {IdentifiableAssetType}
   * @memberof GetAssetResponse
   */
  asset_type: IdentifiableAssetType;
  /**
   * The asset paired to this asset by default, with resolved ticker and name.
   * @type {AssetPairInfo}
   * @memberof GetAssetResponse
   */
  base_asset: AssetPairInfo;
  /**
   * Full name of the asset
   * @type {string}
   * @memberof GetAssetResponse
   */
  name: string;
  /**
   * Available pairs with resolved ticker and name info.
   * @type {Array<AssetPairInfo>}
   * @memberof GetAssetResponse
   */
  pairs: Array<AssetPairInfo>;
  /**
   * Short letter abbreviation of the asset
   * @type {string}
   * @memberof GetAssetResponse
   */
  ticker: string;
}
/**
 *
 * @export
 * @interface GetCategoriesResponse
 */
export interface GetCategoriesResponse {
  /**
   *
   * @type {Array<CategoryRequiredCategoryTypeIdWithId>}
   * @memberof GetCategoriesResponse
   */
  categories: Array<CategoryRequiredCategoryTypeIdWithId>;
  /**
   *
   * @type {CategoryMetadataLookupTables}
   * @memberof GetCategoriesResponse
   */
  lookup_tables: CategoryMetadataLookupTables;
}
/**
 *
 * @export
 * @interface GetFileResponse
 */
export interface GetFileResponse {
  /**
   *
   * @type {string}
   * @memberof GetFileResponse
   */
  created_at: string;
  /**
   *
   * @type {boolean}
   * @memberof GetFileResponse
   */
  has_thumbnail: boolean;
  /**
   *
   * @type {string}
   * @memberof GetFileResponse
   */
  id: string;
  /**
   *
   * @type {string}
   * @memberof GetFileResponse
   */
  mime_type: string;
  /**
   *
   * @type {string}
   * @memberof GetFileResponse
   */
  original_name: string;
  /**
   *
   * @type {number}
   * @memberof GetFileResponse
   */
  size_bytes: number;
  /**
   *
   * @type {string}
   * @memberof GetFileResponse
   */
  status: string;
  /**
   *
   * @type {string}
   * @memberof GetFileResponse
   */
  updated_at: string;
}
/**
 *
 * @export
 * @interface GetHoldingsResponse
 */
export interface GetHoldingsResponse {
  /**
   *
   * @type {Array<GetHoldingsResponseViewModelRow>}
   * @memberof GetHoldingsResponse
   */
  holdings: Array<GetHoldingsResponseViewModelRow>;
  /**
   *
   * @type {HoldingsMetadataLookupTables}
   * @memberof GetHoldingsResponse
   */
  lookup_tables: HoldingsMetadataLookupTables;
}
/**
 *
 * @export
 * @interface GetHoldingsResponseViewModelRow
 */
export interface GetHoldingsResponseViewModelRow {
  /**
   *
   * @type {string}
   * @memberof GetHoldingsResponseViewModelRow
   */
  account_id: string;
  /**
   *
   * @type {number}
   * @memberof GetHoldingsResponseViewModelRow
   */
  asset_id: number;
  /**
   *
   * @type {number}
   * @memberof GetHoldingsResponseViewModelRow
   */
  units: number;
  /**
   *
   * @type {number}
   * @memberof GetHoldingsResponseViewModelRow
   */
  value?: number | null;
}
/**
 *
 * @export
 * @interface GetIndividualTransaction
 */
export interface GetIndividualTransaction {
  /**
   *
   * @type {MetadataLookupTables}
   * @memberof GetIndividualTransaction
   */
  lookup_tables: MetadataLookupTables;
  /**
   *
   * @type {RequiredTransaction}
   * @memberof GetIndividualTransaction
   */
  transaction: RequiredTransaction;
}
/**
 *
 * @export
 * @interface GetNetWorthHistoryResponse
 */
export interface GetNetWorthHistoryResponse {
  /**
   *
   * @type {string}
   * @memberof GetNetWorthHistoryResponse
   */
  range: string;
  /**
   *
   * @type {Array<NetWorthPoint>}
   * @memberof GetNetWorthHistoryResponse
   */
  sums: Array<NetWorthPoint>;
}
/**
 *
 * @export
 * @interface GetPortfolioOverview
 */
export interface GetPortfolioOverview {
  /**
   *
   * @type {HoldingsMetadataLookupTables}
   * @memberof GetPortfolioOverview
   */
  lookup_tables: HoldingsMetadataLookupTables;
  /**
   *
   * @type {PortfolioOverview}
   * @memberof GetPortfolioOverview
   */
  portfolios: PortfolioOverview;
}
/**
 *
 * @export
 * @interface GetUserAssetPairResponse
 */
export interface GetUserAssetPairResponse {
  /**
   *
   * @type {AssetIdentifiableAssetType}
   * @memberof GetUserAssetPairResponse
   */
  main_asset: AssetIdentifiableAssetType;
  /**
   *
   * @type {AssetPairMetadata}
   * @memberof GetUserAssetPairResponse
   */
  metadata?: AssetPairMetadata | null;
  /**
   *
   * @type {AssetIdentifiableAssetType}
   * @memberof GetUserAssetPairResponse
   */
  reference_asset: AssetIdentifiableAssetType;
  /**
   *
   * @type {UserAssetPairMetadata}
   * @memberof GetUserAssetPairResponse
   */
  user_metadata?: UserAssetPairMetadata | null;
}
/**
 *
 * @export
 * @interface GetUserAssetsResponse
 */
export interface GetUserAssetsResponse {
  /**
   *
   * @type {AssetLookupTables}
   * @memberof GetUserAssetsResponse
   */
  lookup_tables: AssetLookupTables;
  /**
   *
   * @type {Array<AssetAssetRequiredAssetTypeIdWithId>}
   * @memberof GetUserAssetsResponse
   */
  results: Array<AssetAssetRequiredAssetTypeIdWithId>;
}
/**
 *
 * @export
 * @interface GroupTransactionItem
 */
export interface GroupTransactionItem {
  /**
   * Overall category of whole group
   * @type {number}
   * @memberof GroupTransactionItem
   */
  category_id: number;
  /**
   * Unrelated to individual transactions date which represent when the collection of transactions occurred
   * @type {number}
   * @memberof GroupTransactionItem
   */
  date: number;
  /**
   * Overall description of whole group
   * @type {string}
   * @memberof GroupTransactionItem
   */
  description: string;
  /**
   * Id representing a single entry in a transaction.
   * @type {string}
   * @memberof GroupTransactionItem
   */
  group_id: string;
  /**
   *
   * @type {string}
   * @memberof GroupTransactionItem
   */
  item_type: GroupTransactionItemItemTypeEnum;
  /**
   * All subtractions grouped into this group
   * @type {Array<RequiredIdentifiableTransaction>}
   * @memberof GroupTransactionItem
   */
  transactions: Array<RequiredIdentifiableTransaction>;
}

export const GroupTransactionItemItemTypeEnum = {
  Group: "group",
} as const;

export type GroupTransactionItemItemTypeEnum =
  (typeof GroupTransactionItemItemTypeEnum)[keyof typeof GroupTransactionItemItemTypeEnum];

/**
 *
 * @export
 * @interface HoldingsMetadataLookupTables
 */
export interface HoldingsMetadataLookupTables {
  /**
   *
   * @type {Array<AccountAccountAccountTypeIdWithId>}
   * @memberof HoldingsMetadataLookupTables
   */
  accounts: Array<AccountAccountAccountTypeIdWithId>;
  /**
   *
   * @type {Array<AssetAssetRequiredAssetTypeIdWithId>}
   * @memberof HoldingsMetadataLookupTables
   */
  assets: Array<AssetAssetRequiredAssetTypeIdWithId>;
}
/**
 *
 * @export
 * @interface IdentifiableAccountType
 */
export interface IdentifiableAccountType {
  /**
   * The id of the Account type
   * @type {number}
   * @memberof IdentifiableAccountType
   */
  id: number;
  /**
   * The name of the Account type
   * @type {string}
   * @memberof IdentifiableAccountType
   */
  name: string;
}
/**
 *
 * @export
 * @interface IdentifiableAssetType
 */
export interface IdentifiableAssetType {
  /**
   * The id of the asset type
   * @type {number}
   * @memberof IdentifiableAssetType
   */
  id: number;
  /**
   * The name of the asset type
   * @type {string}
   * @memberof IdentifiableAssetType
   */
  name: string;
}
/**
 *
 * @export
 * @interface IdentifiableCategoryIdentifiableCategoryType
 */
export interface IdentifiableCategoryIdentifiableCategoryType {
  /**
   * Category name
   * @type {string}
   * @memberof IdentifiableCategoryIdentifiableCategoryType
   */
  category: string;
  /**
   * Category type (generic - can be ID or expanded)
   * @type {IdentifiableCategoryType}
   * @memberof IdentifiableCategoryIdentifiableCategoryType
   */
  category_type: IdentifiableCategoryType;
  /**
   * Icon identifier for the category
   * @type {string}
   * @memberof IdentifiableCategoryIdentifiableCategoryType
   */
  icon: string;
  /**
   * Unique identifier for the category
   * @type {number}
   * @memberof IdentifiableCategoryIdentifiableCategoryType
   */
  id: number;
  /**
   * Whether this is a global category available to all users
   * @type {boolean}
   * @memberof IdentifiableCategoryIdentifiableCategoryType
   */
  is_global: boolean;
  /**
   * Whether this is a system category that cannot be modified
   * @type {boolean}
   * @memberof IdentifiableCategoryIdentifiableCategoryType
   */
  is_system: boolean;
}
/**
 *
 * @export
 * @interface IdentifiableCategoryType
 */
export interface IdentifiableCategoryType {
  /**
   * The ID of the category type
   * @type {number}
   * @memberof IdentifiableCategoryType
   */
  id: number;
  /**
   * Whether this is a global type
   * @type {boolean}
   * @memberof IdentifiableCategoryType
   */
  is_global: boolean;
  /**
   * The name of the category type
   * @type {string}
   * @memberof IdentifiableCategoryType
   */
  name: string;
}
/**
 * @type IdentifiableTransaction
 * @export
 */
export type IdentifiableTransaction =
  | ({ type: "account_fees" } & AccountFeesIdentifiableTransaction)
  | ({
      type: "asset_balance_transfer";
    } & AssetBalanceTransferIdentifiableTransaction)
  | ({ type: "asset_dividend" } & AssetDividendIdentifiableTransaction)
  | ({ type: "asset_purchase" } & AssetPurchaseIdentifiableTransaction)
  | ({ type: "asset_sale" } & AssetSaleIdentifiableTransaction)
  | ({ type: "asset_trade" } & AssetTradeIdentifiableTransaction)
  | ({ type: "asset_transfer_in" } & AssetTransferInIdentifiableTransaction)
  | ({ type: "asset_transfer_out" } & AssetTransferOutIdentifiableTransaction)
  | ({ type: "cash_dividend" } & CashDividendIdentifiableTransaction)
  | ({ type: "cash_transfer_in" } & CashTransferInIdentifiableTransaction)
  | ({ type: "cash_transfer_out" } & CashTransferOutIdentifiableTransaction)
  | ({ type: "regular" } & RegularIdentifiableTransaction);

/**
 *
 * @export
 * @interface IndividualTransactionItem
 */
export interface IndividualTransactionItem extends RequiredIdentifiableTransaction {
  /**
   *
   * @type {string}
   * @memberof IndividualTransactionItem
   */
  item_type: IndividualTransactionItemItemTypeEnum;
}

export const IndividualTransactionItemItemTypeEnum = {
  Individual: "individual",
} as const;

export type IndividualTransactionItemItemTypeEnum =
  (typeof IndividualTransactionItemItemTypeEnum)[keyof typeof IndividualTransactionItemItemTypeEnum];

/**
 *
 * @export
 * @interface IndividualTransactionsPage
 */
export interface IndividualTransactionsPage {
  /**
   *
   * @type {boolean}
   * @memberof IndividualTransactionsPage
   */
  has_more: boolean;
  /**
   *
   * @type {MetadataLookupTables}
   * @memberof IndividualTransactionsPage
   */
  lookup_tables: MetadataLookupTables;
  /**
   *
   * @type {string}
   * @memberof IndividualTransactionsPage
   */
  next_cursor?: string | null;
  /**
   *
   * @type {Array<RequiredIdentifiableTransaction>}
   * @memberof IndividualTransactionsPage
   */
  results: Array<RequiredIdentifiableTransaction>;
  /**
   *
   * @type {number}
   * @memberof IndividualTransactionsPage
   */
  total_results?: number | null;
}
/**
 *
 * @export
 * @interface LoginDetails
 */
export interface LoginDetails {
  /**
   * Password.
   * @type {string}
   * @memberof LoginDetails
   */
  password: string;
  /**
   * Username.
   * @type {string}
   * @memberof LoginDetails
   */
  username: string;
}
/**
 *
 * @export
 * @interface MetadataLookupTables
 */
export interface MetadataLookupTables {
  /**
   *
   * @type {Array<AccountAccountAccountTypeIdWithId>}
   * @memberof MetadataLookupTables
   */
  accounts: Array<AccountAccountAccountTypeIdWithId>;
  /**
   *
   * @type {Array<AssetAssetRequiredAssetTypeIdWithId>}
   * @memberof MetadataLookupTables
   */
  assets: Array<AssetAssetRequiredAssetTypeIdWithId>;
  /**
   *
   * @type {Array<CategoryRequiredCategoryTypeIdWithId>}
   * @memberof MetadataLookupTables
   */
  categories?: Array<CategoryRequiredCategoryTypeIdWithId>;
}
/**
 * A single net worth data point. Unlike AssetRateViewModel, the rate can be negative (liabilities exceeding assets).
 * @export
 * @interface NetWorthPoint
 */
export interface NetWorthPoint {
  /**
   *
   * @type {number}
   * @memberof NetWorthPoint
   */
  date: number;
  /**
   *
   * @type {number}
   * @memberof NetWorthPoint
   */
  rate: number;
}
/**
 *
 * @export
 * @interface PortfolioOverview
 */
export interface PortfolioOverview {
  /**
   *
   * @type {Array<AssetPortfolio>}
   * @memberof PortfolioOverview
   */
  asset_portfolios: Array<AssetPortfolio>;
  /**
   *
   * @type {Array<CashPortfolio>}
   * @memberof PortfolioOverview
   */
  cash_portfolios: Array<CashPortfolio>;
}
/**
 *
 * @export
 * @interface RegisteredUser
 */
export interface RegisteredUser {
  /**
   *
   * @type {string}
   * @memberof RegisteredUser
   */
  id: string;
  /**
   *
   * @type {string}
   * @memberof RegisteredUser
   */
  username: string;
}
/**
 *
 * @export
 * @interface RegularIdentifiableTransaction
 */
export interface RegularIdentifiableTransaction {
  /**
   * Specific bespoke category id.
   * @type {number}
   * @memberof RegularIdentifiableTransaction
   */
  category_id: number;
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof RegularIdentifiableTransaction
   */
  date: number;
  /**
   * Description of the transaction.
   * @type {string}
   * @memberof RegularIdentifiableTransaction
   */
  description?: string | null;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof RegularIdentifiableTransaction
   */
  entry: TransactionEntryWithEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithEntryId>}
   * @memberof RegularIdentifiableTransaction
   */
  fees?: Array<TransactionFeeItemWithEntryId> | null;
  /**
   * Id representing the full transaction.
   * @type {string}
   * @memberof RegularIdentifiableTransaction
   */
  transaction_id: string | null;
  /**
   *
   * @type {string}
   * @memberof RegularIdentifiableTransaction
   */
  type: RegularIdentifiableTransactionTypeEnum;
}

export const RegularIdentifiableTransactionTypeEnum = {
  Regular: "regular",
} as const;

export type RegularIdentifiableTransactionTypeEnum =
  (typeof RegularIdentifiableTransactionTypeEnum)[keyof typeof RegularIdentifiableTransactionTypeEnum];

/**
 *
 * @export
 * @interface RegularRequiredIdentifiableTransaction
 */
export interface RegularRequiredIdentifiableTransaction {
  /**
   * Specific bespoke category id.
   * @type {number}
   * @memberof RegularRequiredIdentifiableTransaction
   */
  category_id: number;
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof RegularRequiredIdentifiableTransaction
   */
  date: number;
  /**
   * Description of the transaction.
   * @type {string}
   * @memberof RegularRequiredIdentifiableTransaction
   */
  description?: string | null;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof RegularRequiredIdentifiableTransaction
   */
  entry: TransactionEntryWithRequiredEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithRequiredEntryId>}
   * @memberof RegularRequiredIdentifiableTransaction
   */
  fees?: Array<TransactionFeeItemWithRequiredEntryId> | null;
  /**
   * Id representing the full transaction.
   * @type {string}
   * @memberof RegularRequiredIdentifiableTransaction
   */
  transaction_id: string;
  /**
   *
   * @type {string}
   * @memberof RegularRequiredIdentifiableTransaction
   */
  type: RegularRequiredIdentifiableTransactionTypeEnum;
}

export const RegularRequiredIdentifiableTransactionTypeEnum = {
  Regular: "regular",
} as const;

export type RegularRequiredIdentifiableTransactionTypeEnum =
  (typeof RegularRequiredIdentifiableTransactionTypeEnum)[keyof typeof RegularRequiredIdentifiableTransactionTypeEnum];

/**
 *
 * @export
 * @interface RegularRequiredTransaction
 */
export interface RegularRequiredTransaction {
  /**
   * Specific bespoke category id.
   * @type {number}
   * @memberof RegularRequiredTransaction
   */
  category_id: number;
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof RegularRequiredTransaction
   */
  date: number;
  /**
   * Description of the transaction.
   * @type {string}
   * @memberof RegularRequiredTransaction
   */
  description?: string | null;
  /**
   *
   * @type {TransactionEntryWithRequiredEntryId}
   * @memberof RegularRequiredTransaction
   */
  entry: TransactionEntryWithRequiredEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithRequiredEntryId>}
   * @memberof RegularRequiredTransaction
   */
  fees?: Array<TransactionFeeItemWithRequiredEntryId> | null;
  /**
   *
   * @type {string}
   * @memberof RegularRequiredTransaction
   */
  type: RegularRequiredTransactionTypeEnum;
}

export const RegularRequiredTransactionTypeEnum = {
  Regular: "regular",
} as const;

export type RegularRequiredTransactionTypeEnum =
  (typeof RegularRequiredTransactionTypeEnum)[keyof typeof RegularRequiredTransactionTypeEnum];

/**
 *
 * @export
 * @interface RegularTransactionInput
 */
export interface RegularTransactionInput {
  /**
   * Specific bespoke category id.
   * @type {number}
   * @memberof RegularTransactionInput
   */
  category_id: number;
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof RegularTransactionInput
   */
  date: number;
  /**
   * Description of the transaction.
   * @type {string}
   * @memberof RegularTransactionInput
   */
  description?: string | null;
  /**
   *
   * @type {TransactionEntry}
   * @memberof RegularTransactionInput
   */
  entry: TransactionEntry;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItem>}
   * @memberof RegularTransactionInput
   */
  fees?: Array<TransactionFeeItem> | null;
  /**
   *
   * @type {string}
   * @memberof RegularTransactionInput
   */
  type: RegularTransactionInputTypeEnum;
}

export const RegularTransactionInputTypeEnum = {
  Regular: "regular",
} as const;

export type RegularTransactionInputTypeEnum =
  (typeof RegularTransactionInputTypeEnum)[keyof typeof RegularTransactionInputTypeEnum];

/**
 *
 * @export
 * @interface RegularTransactionWithEntryIds
 */
export interface RegularTransactionWithEntryIds {
  /**
   * Specific bespoke category id.
   * @type {number}
   * @memberof RegularTransactionWithEntryIds
   */
  category_id: number;
  /**
   * Date when the transaction occured.
   * @type {number}
   * @memberof RegularTransactionWithEntryIds
   */
  date: number;
  /**
   * Description of the transaction.
   * @type {string}
   * @memberof RegularTransactionWithEntryIds
   */
  description?: string | null;
  /**
   *
   * @type {TransactionEntryWithEntryId}
   * @memberof RegularTransactionWithEntryIds
   */
  entry: TransactionEntryWithEntryId;
  /**
   * Any other fees related to the transaction, such as transfer or conversion fees.
   * @type {Array<TransactionFeeItemWithEntryId>}
   * @memberof RegularTransactionWithEntryIds
   */
  fees?: Array<TransactionFeeItemWithEntryId> | null;
  /**
   *
   * @type {string}
   * @memberof RegularTransactionWithEntryIds
   */
  type: RegularTransactionWithEntryIdsTypeEnum;
}

export const RegularTransactionWithEntryIdsTypeEnum = {
  Regular: "regular",
} as const;

export type RegularTransactionWithEntryIdsTypeEnum =
  (typeof RegularTransactionWithEntryIdsTypeEnum)[keyof typeof RegularTransactionWithEntryIdsTypeEnum];

/**
 * @type RequiredIdentifiableTransaction
 * @export
 */
export type RequiredIdentifiableTransaction =
  | ({ type: "account_fees" } & AccountFeesRequiredIdentifiableTransaction)
  | ({
      type: "asset_balance_transfer";
    } & AssetBalanceTransferRequiredIdentifiableTransaction)
  | ({ type: "asset_dividend" } & AssetDividendRequiredIdentifiableTransaction)
  | ({ type: "asset_purchase" } & AssetPurchaseRequiredIdentifiableTransaction)
  | ({ type: "asset_sale" } & AssetSaleRequiredIdentifiableTransaction)
  | ({ type: "asset_trade" } & AssetTradeRequiredIdentifiableTransaction)
  | ({
      type: "asset_transfer_in";
    } & AssetTransferInRequiredIdentifiableTransaction)
  | ({
      type: "asset_transfer_out";
    } & AssetTransferOutRequiredIdentifiableTransaction)
  | ({ type: "cash_dividend" } & CashDividendRequiredIdentifiableTransaction)
  | ({
      type: "cash_transfer_in";
    } & CashTransferInRequiredIdentifiableTransaction)
  | ({
      type: "cash_transfer_out";
    } & CashTransferOutRequiredIdentifiableTransaction)
  | ({ type: "regular" } & RegularRequiredIdentifiableTransaction);

/**
 * @type RequiredTransaction
 * @export
 */
export type RequiredTransaction =
  | ({ type: "account_fees" } & AccountFeesRequiredTransaction)
  | ({
      type: "asset_balance_transfer";
    } & AssetBalanceTransferRequiredTransaction)
  | ({ type: "asset_dividend" } & AssetDividendRequiredTransaction)
  | ({ type: "asset_purchase" } & AssetPurchaseRequiredTransaction)
  | ({ type: "asset_sale" } & AssetSaleRequiredTransaction)
  | ({ type: "asset_trade" } & AssetTradeRequiredTransaction)
  | ({ type: "asset_transfer_in" } & AssetTransferInRequiredTransaction)
  | ({ type: "asset_transfer_out" } & AssetTransferOutRequiredTransaction)
  | ({ type: "cash_dividend" } & CashDividendRequiredTransaction)
  | ({ type: "cash_transfer_in" } & CashTransferInRequiredTransaction)
  | ({ type: "cash_transfer_out" } & CashTransferOutRequiredTransaction)
  | ({ type: "regular" } & RegularRequiredTransaction);

/**
 *
 * @export
 * @interface SearchCategoriesResponse
 */
export interface SearchCategoriesResponse {
  /**
   * The lookup tables for the results
   * @type {CategoryMetadataLookupTables}
   * @memberof SearchCategoriesResponse
   */
  lookup_tables: CategoryMetadataLookupTables;
  /**
   * One page of results
   * @type {Array<CategoryRequiredCategoryTypeIdWithId>}
   * @memberof SearchCategoriesResponse
   */
  results: Array<CategoryRequiredCategoryTypeIdWithId>;
  /**
   * The total number of results available
   * @type {number}
   * @memberof SearchCategoriesResponse
   */
  total_results: number;
}
/**
 *
 * @export
 * @interface SharedAssetPairMetadata
 */
export interface SharedAssetPairMetadata {
  /**
   *
   * @type {number}
   * @memberof SharedAssetPairMetadata
   */
  last_updated: number;
  /**
   *
   * @type {number}
   * @memberof SharedAssetPairMetadata
   */
  latest_rate: number;
  /**
   *
   * @type {number}
   * @memberof SharedAssetPairMetadata
   */
  volume?: number | null;
}
/**
 * A single account-asset-entry in a transaction.  The generic parameter `A` determines the amount type: - `Amount` – unvalidated (default, used in response models & macro-generated enums) - `PositiveAmount` – must be > 0, validated at parse time - `NegativeAmount` – must be < 0, validated at parse time - `NonZeroAmount` – must not be 0, validated at parse time
 * @export
 * @interface TransactionEntry
 */
export interface TransactionEntry {
  /**
   * The id of an account for which the entry is related.
   * @type {string}
   * @memberof TransactionEntry
   */
  account_id: string;
  /**
   * The number of units of the asset that were added or removed from the account.
   * @type {number}
   * @memberof TransactionEntry
   */
  amount: number;
  /**
   * The id of an asset in the account for which the entry is related.
   * @type {number}
   * @memberof TransactionEntry
   */
  asset_id: number;
}
/**
 * A single account-asset-entry in a transaction.  The generic parameter `A` determines the amount type: - `Amount` – unvalidated (default, used in response models & macro-generated enums) - `PositiveAmount` – must be > 0, validated at parse time - `NegativeAmount` – must be < 0, validated at parse time - `NonZeroAmount` – must not be 0, validated at parse time
 * @export
 * @interface TransactionEntryWithEntryId
 */
export interface TransactionEntryWithEntryId {
  /**
   * The id of an account for which the entry is related.
   * @type {string}
   * @memberof TransactionEntryWithEntryId
   */
  account_id: string;
  /**
   * The number of units of the asset that were added or removed from the account.
   * @type {number}
   * @memberof TransactionEntryWithEntryId
   */
  amount: number;
  /**
   * The id of an asset in the account for which the entry is related.
   * @type {number}
   * @memberof TransactionEntryWithEntryId
   */
  asset_id: number;
  /**
   * Id representing a single entry in a transaction.
   * @type {number}
   * @memberof TransactionEntryWithEntryId
   */
  entry_id: number | null;
}
/**
 * A single account-asset-entry in a transaction.  The generic parameter `A` determines the amount type: - `Amount` – unvalidated (default, used in response models & macro-generated enums) - `PositiveAmount` – must be > 0, validated at parse time - `NegativeAmount` – must be < 0, validated at parse time - `NonZeroAmount` – must not be 0, validated at parse time
 * @export
 * @interface TransactionEntryWithRequiredEntryId
 */
export interface TransactionEntryWithRequiredEntryId {
  /**
   * The id of an account for which the entry is related.
   * @type {string}
   * @memberof TransactionEntryWithRequiredEntryId
   */
  account_id: string;
  /**
   * The number of units of the asset that were added or removed from the account.
   * @type {number}
   * @memberof TransactionEntryWithRequiredEntryId
   */
  amount: number;
  /**
   * The id of an asset in the account for which the entry is related.
   * @type {number}
   * @memberof TransactionEntryWithRequiredEntryId
   */
  asset_id: number;
  /**
   * Id representing a single entry in a transaction.
   * @type {number}
   * @memberof TransactionEntryWithRequiredEntryId
   */
  entry_id: number;
}
/**
 * A single account-asset-entry in a transaction.  The generic parameter `A` determines the amount type: - `Amount` – unvalidated (default, used in response models & macro-generated enums) - `PositiveAmount` – must be > 0, validated at parse time - `NegativeAmount` – must be < 0, validated at parse time - `NonZeroAmount` – must not be 0, validated at parse time
 * @export
 * @interface TransactionFeeItem
 */
export interface TransactionFeeItem {
  /**
   * The id of an account for which the entry is related.
   * @type {string}
   * @memberof TransactionFeeItem
   */
  account_id: string;
  /**
   * The number of units of the asset that were added or removed from the account.
   * @type {number}
   * @memberof TransactionFeeItem
   */
  amount: number;
  /**
   * The id of an asset in the account for which the entry is related.
   * @type {number}
   * @memberof TransactionFeeItem
   */
  asset_id: number;
  /**
   * The type of fee related to a transaction.
   * @type {TransactionFeeType}
   * @memberof TransactionFeeItem
   */
  fee_type: TransactionFeeType;
}

/**
 * A single account-asset-entry in a transaction.  The generic parameter `A` determines the amount type: - `Amount` – unvalidated (default, used in response models & macro-generated enums) - `PositiveAmount` – must be > 0, validated at parse time - `NegativeAmount` – must be < 0, validated at parse time - `NonZeroAmount` – must not be 0, validated at parse time
 * @export
 * @interface TransactionFeeItemWithEntryId
 */
export interface TransactionFeeItemWithEntryId {
  /**
   * The id of an account for which the entry is related.
   * @type {string}
   * @memberof TransactionFeeItemWithEntryId
   */
  account_id: string;
  /**
   * The number of units of the asset that were added or removed from the account.
   * @type {number}
   * @memberof TransactionFeeItemWithEntryId
   */
  amount: number;
  /**
   * The id of an asset in the account for which the entry is related.
   * @type {number}
   * @memberof TransactionFeeItemWithEntryId
   */
  asset_id: number;
  /**
   * Id representing a single entry in a transaction.
   * @type {number}
   * @memberof TransactionFeeItemWithEntryId
   */
  entry_id: number | null;
  /**
   * The type of fee related to a transaction.
   * @type {TransactionFeeType}
   * @memberof TransactionFeeItemWithEntryId
   */
  fee_type: TransactionFeeType;
}

/**
 * A single account-asset-entry in a transaction.  The generic parameter `A` determines the amount type: - `Amount` – unvalidated (default, used in response models & macro-generated enums) - `PositiveAmount` – must be > 0, validated at parse time - `NegativeAmount` – must be < 0, validated at parse time - `NonZeroAmount` – must not be 0, validated at parse time
 * @export
 * @interface TransactionFeeItemWithRequiredEntryId
 */
export interface TransactionFeeItemWithRequiredEntryId {
  /**
   * The id of an account for which the entry is related.
   * @type {string}
   * @memberof TransactionFeeItemWithRequiredEntryId
   */
  account_id: string;
  /**
   * The number of units of the asset that were added or removed from the account.
   * @type {number}
   * @memberof TransactionFeeItemWithRequiredEntryId
   */
  amount: number;
  /**
   * The id of an asset in the account for which the entry is related.
   * @type {number}
   * @memberof TransactionFeeItemWithRequiredEntryId
   */
  asset_id: number;
  /**
   * Id representing a single entry in a transaction.
   * @type {number}
   * @memberof TransactionFeeItemWithRequiredEntryId
   */
  entry_id: number;
  /**
   * The type of fee related to a transaction.
   * @type {TransactionFeeType}
   * @memberof TransactionFeeItemWithRequiredEntryId
   */
  fee_type: TransactionFeeType;
}

/**
 *
 * @export
 * @enum {string}
 */

export const TransactionFeeType = {
  Transaction: "transaction",
  Exchange: "exchange",
  WithholdingTax: "withholding_tax",
} as const;

export type TransactionFeeType =
  (typeof TransactionFeeType)[keyof typeof TransactionFeeType];

/**
 *
 * @export
 * @interface TransactionGroupIdentifiableTransactionWithIdentifiableEntries
 */
export interface TransactionGroupIdentifiableTransactionWithIdentifiableEntries {
  /**
   * Overall category of whole group
   * @type {number}
   * @memberof TransactionGroupIdentifiableTransactionWithIdentifiableEntries
   */
  category_id: number;
  /**
   * Unrelated to individual transactions date which represent when the collection of transactions occurred
   * @type {number}
   * @memberof TransactionGroupIdentifiableTransactionWithIdentifiableEntries
   */
  date: number;
  /**
   * Overall description of whole group
   * @type {string}
   * @memberof TransactionGroupIdentifiableTransactionWithIdentifiableEntries
   */
  description: string;
  /**
   * All subtractions grouped into this group
   * @type {Array<IdentifiableTransaction>}
   * @memberof TransactionGroupIdentifiableTransactionWithIdentifiableEntries
   */
  transactions: Array<IdentifiableTransaction>;
}
/**
 *
 * @export
 * @interface TransactionGroupRequiredIdentifiableTransactionWithIdentifiableEntries
 */
export interface TransactionGroupRequiredIdentifiableTransactionWithIdentifiableEntries {
  /**
   * Overall category of whole group
   * @type {number}
   * @memberof TransactionGroupRequiredIdentifiableTransactionWithIdentifiableEntries
   */
  category_id: number;
  /**
   * Unrelated to individual transactions date which represent when the collection of transactions occurred
   * @type {number}
   * @memberof TransactionGroupRequiredIdentifiableTransactionWithIdentifiableEntries
   */
  date: number;
  /**
   * Overall description of whole group
   * @type {string}
   * @memberof TransactionGroupRequiredIdentifiableTransactionWithIdentifiableEntries
   */
  description: string;
  /**
   * All subtractions grouped into this group
   * @type {Array<RequiredIdentifiableTransaction>}
   * @memberof TransactionGroupRequiredIdentifiableTransactionWithIdentifiableEntries
   */
  transactions: Array<RequiredIdentifiableTransaction>;
}
/**
 *
 * @export
 * @interface TransactionGroupTransactionGroupIdTransactionGroupRequiredIdentifiableTransactionWithIdentifiableEntriesAndId
 */
export interface TransactionGroupTransactionGroupIdTransactionGroupRequiredIdentifiableTransactionWithIdentifiableEntriesAndId {
  /**
   * Overall category of whole group
   * @type {number}
   * @memberof TransactionGroupTransactionGroupIdTransactionGroupRequiredIdentifiableTransactionWithIdentifiableEntriesAndId
   */
  category_id: number;
  /**
   * Unrelated to individual transactions date which represent when the collection of transactions occurred
   * @type {number}
   * @memberof TransactionGroupTransactionGroupIdTransactionGroupRequiredIdentifiableTransactionWithIdentifiableEntriesAndId
   */
  date: number;
  /**
   * Overall description of whole group
   * @type {string}
   * @memberof TransactionGroupTransactionGroupIdTransactionGroupRequiredIdentifiableTransactionWithIdentifiableEntriesAndId
   */
  description: string;
  /**
   * Id representing a single entry in a transaction.
   * @type {string}
   * @memberof TransactionGroupTransactionGroupIdTransactionGroupRequiredIdentifiableTransactionWithIdentifiableEntriesAndId
   */
  group_id: string;
  /**
   * All subtractions grouped into this group
   * @type {Array<RequiredIdentifiableTransaction>}
   * @memberof TransactionGroupTransactionGroupIdTransactionGroupRequiredIdentifiableTransactionWithIdentifiableEntriesAndId
   */
  transactions: Array<RequiredIdentifiableTransaction>;
}
/**
 *
 * @export
 * @interface TransactionGroupTransactionWithEntries
 */
export interface TransactionGroupTransactionWithEntries {
  /**
   * Overall category of whole group
   * @type {number}
   * @memberof TransactionGroupTransactionWithEntries
   */
  category_id: number;
  /**
   * Unrelated to individual transactions date which represent when the collection of transactions occurred
   * @type {number}
   * @memberof TransactionGroupTransactionWithEntries
   */
  date: number;
  /**
   * Overall description of whole group
   * @type {string}
   * @memberof TransactionGroupTransactionWithEntries
   */
  description: string;
  /**
   * All subtractions grouped into this group
   * @type {Array<TransactionInput>}
   * @memberof TransactionGroupTransactionWithEntries
   */
  transactions: Array<TransactionInput>;
}
/**
 *
 * @export
 * @interface TransactionGroupsPage
 */
export interface TransactionGroupsPage {
  /**
   *
   * @type {boolean}
   * @memberof TransactionGroupsPage
   */
  has_more: boolean;
  /**
   *
   * @type {MetadataLookupTables}
   * @memberof TransactionGroupsPage
   */
  lookup_tables: MetadataLookupTables;
  /**
   *
   * @type {string}
   * @memberof TransactionGroupsPage
   */
  next_cursor?: string | null;
  /**
   *
   * @type {Array<TransactionGroupTransactionGroupIdTransactionGroupRequiredIdentifiableTransactionWithIdentifiableEntriesAndId>}
   * @memberof TransactionGroupsPage
   */
  results: Array<TransactionGroupTransactionGroupIdTransactionGroupRequiredIdentifiableTransactionWithIdentifiableEntriesAndId>;
  /**
   *
   * @type {number}
   * @memberof TransactionGroupsPage
   */
  total_results?: number | null;
}
/**
 * @type TransactionInput
 * @export
 */
export type TransactionInput =
  | ({ type: "account_fees" } & AccountFeesTransactionInput)
  | ({ type: "asset_balance_transfer" } & AssetBalanceTransferTransactionInput)
  | ({ type: "asset_dividend" } & AssetDividendTransactionInput)
  | ({ type: "asset_purchase" } & AssetPurchaseTransactionInput)
  | ({ type: "asset_sale" } & AssetSaleTransactionInput)
  | ({ type: "asset_trade" } & AssetTradeTransactionInput)
  | ({ type: "asset_transfer_in" } & AssetTransferInTransactionInput)
  | ({ type: "asset_transfer_out" } & AssetTransferOutTransactionInput)
  | ({ type: "cash_dividend" } & CashDividendTransactionInput)
  | ({ type: "cash_transfer_in" } & CashTransferInTransactionInput)
  | ({ type: "cash_transfer_out" } & CashTransferOutTransactionInput)
  | ({ type: "regular" } & RegularTransactionInput);

/**
 * @type TransactionWithEntryIds
 * @export
 */
export type TransactionWithEntryIds =
  | ({ type: "account_fees" } & AccountFeesTransactionWithEntryIds)
  | ({
      type: "asset_balance_transfer";
    } & AssetBalanceTransferTransactionWithEntryIds)
  | ({ type: "asset_dividend" } & AssetDividendTransactionWithEntryIds)
  | ({ type: "asset_purchase" } & AssetPurchaseTransactionWithEntryIds)
  | ({ type: "asset_sale" } & AssetSaleTransactionWithEntryIds)
  | ({ type: "asset_trade" } & AssetTradeTransactionWithEntryIds)
  | ({ type: "asset_transfer_in" } & AssetTransferInTransactionWithEntryIds)
  | ({ type: "asset_transfer_out" } & AssetTransferOutTransactionWithEntryIds)
  | ({ type: "cash_dividend" } & CashDividendTransactionWithEntryIds)
  | ({ type: "cash_transfer_in" } & CashTransferInTransactionWithEntryIds)
  | ({ type: "cash_transfer_out" } & CashTransferOutTransactionWithEntryIds)
  | ({ type: "regular" } & RegularTransactionWithEntryIds);

/**
 *
 * @export
 * @interface UpdateAccount
 */
export interface UpdateAccount {
  /**
   *
   * @type {number}
   * @memberof UpdateAccount
   */
  account_type: number;
  /**
   *
   * @type {number}
   * @memberof UpdateAccount
   */
  liquidity_type: number;
  /**
   * Account name
   * @type {string}
   * @memberof UpdateAccount
   */
  name: string;
  /**
   * Ownership share. Must be > 0 and <= 1.
   * @type {number}
   * @memberof UpdateAccount
   */
  ownership_share: number;
}
/**
 *
 * @export
 * @interface UpdateTransactionGroupResponse
 */
export interface UpdateTransactionGroupResponse {
  /**
   *
   * @type {Array<AccountAccountAccountTypeIdWithId>}
   * @memberof UpdateTransactionGroupResponse
   */
  accounts: Array<AccountAccountAccountTypeIdWithId>;
  /**
   *
   * @type {Array<AssetAssetRequiredAssetTypeIdWithId>}
   * @memberof UpdateTransactionGroupResponse
   */
  assets: Array<AssetAssetRequiredAssetTypeIdWithId>;
  /**
   *
   * @type {Array<CategoryRequiredCategoryTypeIdWithId>}
   * @memberof UpdateTransactionGroupResponse
   */
  categories?: Array<CategoryRequiredCategoryTypeIdWithId>;
  /**
   *
   * @type {TransactionGroupRequiredIdentifiableTransactionWithIdentifiableEntries}
   * @memberof UpdateTransactionGroupResponse
   */
  group: TransactionGroupRequiredIdentifiableTransactionWithIdentifiableEntries;
}
/**
 *
 * @export
 * @interface UpdateTransactionRequest
 */
export interface UpdateTransactionRequest {
  /**
   *
   * @type {TransactionWithEntryIds}
   * @memberof UpdateTransactionRequest
   */
  transaction: TransactionWithEntryIds;
}
/**
 *
 * @export
 * @interface UpdateTransactionResponse
 */
export interface UpdateTransactionResponse {
  /**
   *
   * @type {Array<AccountAccountAccountTypeIdWithId>}
   * @memberof UpdateTransactionResponse
   */
  accounts: Array<AccountAccountAccountTypeIdWithId>;
  /**
   *
   * @type {Array<AssetAssetRequiredAssetTypeIdWithId>}
   * @memberof UpdateTransactionResponse
   */
  assets: Array<AssetAssetRequiredAssetTypeIdWithId>;
  /**
   *
   * @type {Array<CategoryRequiredCategoryTypeIdWithId>}
   * @memberof UpdateTransactionResponse
   */
  categories?: Array<CategoryRequiredCategoryTypeIdWithId>;
  /**
   *
   * @type {RequiredTransaction}
   * @memberof UpdateTransactionResponse
   */
  transaction: RequiredTransaction;
}
/**
 *
 * @export
 * @interface UploadMetadata
 */
export interface UploadMetadata {
  /**
   *
   * @type {number}
   * @memberof UploadMetadata
   */
  upload_expires_in_seconds: number;
  /**
   *
   * @type {{ [key: string]: string; }}
   * @memberof UploadMetadata
   */
  upload_headers: { [key: string]: string };
  /**
   *
   * @type {string}
   * @memberof UploadMetadata
   */
  upload_method: string;
  /**
   *
   * @type {string}
   * @memberof UploadMetadata
   */
  upload_url: string;
}
/**
 *
 * @export
 * @interface UserAssetPairMetadata
 */
export interface UserAssetPairMetadata {
  /**
   * Exchange name
   * @type {string}
   * @memberof UserAssetPairMetadata
   */
  exchange: string;
}
/**
 *
 * @export
 * @interface UserMetadata
 */
export interface UserMetadata {
  /**
   *
   * @type {string}
   * @memberof UserMetadata
   */
  image_url?: string | null;
  /**
   *
   * @type {string}
   * @memberof UserMetadata
   */
  username: string;
}

/**
 * AccountPortfolioApi - axios parameter creator
 * @export
 */
export const AccountPortfolioApiAxiosParamCreator = function (
  configuration?: Configuration,
) {
  return {
    /**
     * Returns net worth history scoped to a specific account.
     * @summary Get Account Net Worth History
     * @param {string} userId
     * @param {string} accountId
     * @param {string} [range]
     * @param {number} [defaultAssetId]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getAccountNetworthHistory: async (
      userId: string,
      accountId: string,
      range?: string,
      defaultAssetId?: number,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("getAccountNetworthHistory", "userId", userId);
      // verify required parameter 'accountId' is not null or undefined
      assertParamExists("getAccountNetworthHistory", "accountId", accountId);
      const localVarPath =
        `/api/users/{user_id}/accounts/{account_id}/portfolio/history`
          .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)))
          .replace(`{${"account_id"}}`, encodeURIComponent(String(accountId)));
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      if (range !== undefined) {
        localVarQueryParameter["range"] = range;
      }

      if (defaultAssetId !== undefined) {
        localVarQueryParameter["default_asset_id"] = defaultAssetId;
      }

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Returns portfolio overview scoped to a specific account.
     * @summary Get Account Portfolio Overview
     * @param {string} userId
     * @param {string} accountId
     * @param {number} [defaultAssetId]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getAccountPortfolioOverview: async (
      userId: string,
      accountId: string,
      defaultAssetId?: number,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("getAccountPortfolioOverview", "userId", userId);
      // verify required parameter 'accountId' is not null or undefined
      assertParamExists("getAccountPortfolioOverview", "accountId", accountId);
      const localVarPath =
        `/api/users/{user_id}/accounts/{account_id}/portfolio/overview`
          .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)))
          .replace(`{${"account_id"}}`, encodeURIComponent(String(accountId)));
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      if (defaultAssetId !== undefined) {
        localVarQueryParameter["default_asset_id"] = defaultAssetId;
      }

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Returns paginated transactions scoped to a specific account.
     * @summary Get Account Transactions
     * @param {string} userId
     * @param {string} accountId
     * @param {number} [count]
     * @param {number} [start]
     * @param {string} [query]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getAccountTransactions: async (
      userId: string,
      accountId: string,
      count?: number,
      start?: number,
      query?: string,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("getAccountTransactions", "userId", userId);
      // verify required parameter 'accountId' is not null or undefined
      assertParamExists("getAccountTransactions", "accountId", accountId);
      const localVarPath =
        `/api/users/{user_id}/accounts/{account_id}/transactions`
          .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)))
          .replace(`{${"account_id"}}`, encodeURIComponent(String(accountId)));
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      if (count !== undefined) {
        localVarQueryParameter["count"] = count;
      }

      if (start !== undefined) {
        localVarQueryParameter["start"] = start;
      }

      if (query !== undefined) {
        localVarQueryParameter["query"] = query;
      }

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
  };
};

/**
 * AccountPortfolioApi - functional programming interface
 * @export
 */
export const AccountPortfolioApiFp = function (configuration?: Configuration) {
  const localVarAxiosParamCreator =
    AccountPortfolioApiAxiosParamCreator(configuration);
  return {
    /**
     * Returns net worth history scoped to a specific account.
     * @summary Get Account Net Worth History
     * @param {string} userId
     * @param {string} accountId
     * @param {string} [range]
     * @param {number} [defaultAssetId]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getAccountNetworthHistory(
      userId: string,
      accountId: string,
      range?: string,
      defaultAssetId?: number,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<GetNetWorthHistoryResponse>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.getAccountNetworthHistory(
          userId,
          accountId,
          range,
          defaultAssetId,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["AccountPortfolioApi.getAccountNetworthHistory"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Returns portfolio overview scoped to a specific account.
     * @summary Get Account Portfolio Overview
     * @param {string} userId
     * @param {string} accountId
     * @param {number} [defaultAssetId]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getAccountPortfolioOverview(
      userId: string,
      accountId: string,
      defaultAssetId?: number,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<GetPortfolioOverview>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.getAccountPortfolioOverview(
          userId,
          accountId,
          defaultAssetId,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["AccountPortfolioApi.getAccountPortfolioOverview"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Returns paginated transactions scoped to a specific account.
     * @summary Get Account Transactions
     * @param {string} userId
     * @param {string} accountId
     * @param {number} [count]
     * @param {number} [start]
     * @param {string} [query]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getAccountTransactions(
      userId: string,
      accountId: string,
      count?: number,
      start?: number,
      query?: string,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<AccountTransactionsPage>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.getAccountTransactions(
          userId,
          accountId,
          count,
          start,
          query,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["AccountPortfolioApi.getAccountTransactions"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
  };
};

/**
 * AccountPortfolioApi - factory interface
 * @export
 */
export const AccountPortfolioApiFactory = function (
  configuration?: Configuration,
  basePath?: string,
  axios?: AxiosInstance,
) {
  const localVarFp = AccountPortfolioApiFp(configuration);
  return {
    /**
     * Returns net worth history scoped to a specific account.
     * @summary Get Account Net Worth History
     * @param {string} userId
     * @param {string} accountId
     * @param {string} [range]
     * @param {number} [defaultAssetId]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getAccountNetworthHistory(
      userId: string,
      accountId: string,
      range?: string,
      defaultAssetId?: number,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<GetNetWorthHistoryResponse> {
      return localVarFp
        .getAccountNetworthHistory(
          userId,
          accountId,
          range,
          defaultAssetId,
          options,
        )
        .then((request) => request(axios, basePath));
    },
    /**
     * Returns portfolio overview scoped to a specific account.
     * @summary Get Account Portfolio Overview
     * @param {string} userId
     * @param {string} accountId
     * @param {number} [defaultAssetId]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getAccountPortfolioOverview(
      userId: string,
      accountId: string,
      defaultAssetId?: number,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<GetPortfolioOverview> {
      return localVarFp
        .getAccountPortfolioOverview(userId, accountId, defaultAssetId, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Returns paginated transactions scoped to a specific account.
     * @summary Get Account Transactions
     * @param {string} userId
     * @param {string} accountId
     * @param {number} [count]
     * @param {number} [start]
     * @param {string} [query]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getAccountTransactions(
      userId: string,
      accountId: string,
      count?: number,
      start?: number,
      query?: string,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<AccountTransactionsPage> {
      return localVarFp
        .getAccountTransactions(userId, accountId, count, start, query, options)
        .then((request) => request(axios, basePath));
    },
  };
};

/**
 * AccountPortfolioApi - interface
 * @export
 * @interface AccountPortfolioApi
 */
export interface AccountPortfolioApiInterface {
  /**
   * Returns net worth history scoped to a specific account.
   * @summary Get Account Net Worth History
   * @param {string} userId
   * @param {string} accountId
   * @param {string} [range]
   * @param {number} [defaultAssetId]
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AccountPortfolioApiInterface
   */
  getAccountNetworthHistory(
    userId: string,
    accountId: string,
    range?: string,
    defaultAssetId?: number,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<GetNetWorthHistoryResponse>;

  /**
   * Returns portfolio overview scoped to a specific account.
   * @summary Get Account Portfolio Overview
   * @param {string} userId
   * @param {string} accountId
   * @param {number} [defaultAssetId]
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AccountPortfolioApiInterface
   */
  getAccountPortfolioOverview(
    userId: string,
    accountId: string,
    defaultAssetId?: number,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<GetPortfolioOverview>;

  /**
   * Returns paginated transactions scoped to a specific account.
   * @summary Get Account Transactions
   * @param {string} userId
   * @param {string} accountId
   * @param {number} [count]
   * @param {number} [start]
   * @param {string} [query]
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AccountPortfolioApiInterface
   */
  getAccountTransactions(
    userId: string,
    accountId: string,
    count?: number,
    start?: number,
    query?: string,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<AccountTransactionsPage>;
}

/**
 * AccountPortfolioApi - object-oriented interface
 * @export
 * @class AccountPortfolioApi
 * @extends {BaseAPI}
 */
export class AccountPortfolioApi
  extends BaseAPI
  implements AccountPortfolioApiInterface
{
  /**
   * Returns net worth history scoped to a specific account.
   * @summary Get Account Net Worth History
   * @param {string} userId
   * @param {string} accountId
   * @param {string} [range]
   * @param {number} [defaultAssetId]
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AccountPortfolioApi
   */
  public getAccountNetworthHistory(
    userId: string,
    accountId: string,
    range?: string,
    defaultAssetId?: number,
    options?: RawAxiosRequestConfig,
  ) {
    return AccountPortfolioApiFp(this.configuration)
      .getAccountNetworthHistory(
        userId,
        accountId,
        range,
        defaultAssetId,
        options,
      )
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Returns portfolio overview scoped to a specific account.
   * @summary Get Account Portfolio Overview
   * @param {string} userId
   * @param {string} accountId
   * @param {number} [defaultAssetId]
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AccountPortfolioApi
   */
  public getAccountPortfolioOverview(
    userId: string,
    accountId: string,
    defaultAssetId?: number,
    options?: RawAxiosRequestConfig,
  ) {
    return AccountPortfolioApiFp(this.configuration)
      .getAccountPortfolioOverview(userId, accountId, defaultAssetId, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Returns paginated transactions scoped to a specific account.
   * @summary Get Account Transactions
   * @param {string} userId
   * @param {string} accountId
   * @param {number} [count]
   * @param {number} [start]
   * @param {string} [query]
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AccountPortfolioApi
   */
  public getAccountTransactions(
    userId: string,
    accountId: string,
    count?: number,
    start?: number,
    query?: string,
    options?: RawAxiosRequestConfig,
  ) {
    return AccountPortfolioApiFp(this.configuration)
      .getAccountTransactions(userId, accountId, count, start, query, options)
      .then((request) => request(this.axios, this.basePath));
  }
}

/**
 * AccountsApi - axios parameter creator
 * @export
 */
export const AccountsApiAxiosParamCreator = function (
  configuration?: Configuration,
) {
  return {
    /**
     * Adds a new account to the user.
     * @summary Add Account
     * @param {string} userId
     * @param {UpdateAccount} updateAccount
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    addAccount: async (
      userId: string,
      updateAccount: UpdateAccount,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("addAccount", "userId", userId);
      // verify required parameter 'updateAccount' is not null or undefined
      assertParamExists("addAccount", "updateAccount", updateAccount);
      const localVarPath = `/api/users/{user_id}/accounts`.replace(
        `{${"user_id"}}`,
        encodeURIComponent(String(userId)),
      );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "POST",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      localVarHeaderParameter["Content-Type"] = "application/json";

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };
      localVarRequestOptions.data = serializeDataIfNeeded(
        updateAccount,
        localVarRequestOptions,
        configuration,
      );

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Marks account as inactive so that its unavailable anymore.
     * @summary Delete Account
     * @param {string} accountId
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    deleteAccount: async (
      accountId: string,
      userId: string,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'accountId' is not null or undefined
      assertParamExists("deleteAccount", "accountId", accountId);
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("deleteAccount", "userId", userId);
      const localVarPath = `/api/users/{user_id}/accounts/{account_id}`
        .replace(`{${"account_id"}}`, encodeURIComponent(String(accountId)))
        .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)));
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "DELETE",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Gets a specific account of the user with metadata.
     * @summary Get Account
     * @param {string} accountId
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getAccount: async (
      accountId: string,
      userId: string,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'accountId' is not null or undefined
      assertParamExists("getAccount", "accountId", accountId);
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("getAccount", "userId", userId);
      const localVarPath = `/api/users/{user_id}/accounts/{account_id}`
        .replace(`{${"account_id"}}`, encodeURIComponent(String(accountId)))
        .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)));
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Retrieves all available account liquidity types
     * @summary Get Account Liquidity Types
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getAccountLiquidityTypes: async (
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      const localVarPath = `/api/accounts/liquidity-types`;
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Retrieves all available account types
     * @summary Get Account Types
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getAccountTypes: async (
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      const localVarPath = `/api/accounts/types`;
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Gets all accounts and its metadata associated with user
     * @summary Get Accounts
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getAccounts: async (
      userId: string,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("getAccounts", "userId", userId);
      const localVarPath = `/api/users/{user_id}/accounts`.replace(
        `{${"user_id"}}`,
        encodeURIComponent(String(userId)),
      );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Updates a specific account of the user with metadata.
     * @summary Update Account
     * @param {string} accountId
     * @param {string} userId
     * @param {UpdateAccount} updateAccount
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    updateAccount: async (
      accountId: string,
      userId: string,
      updateAccount: UpdateAccount,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'accountId' is not null or undefined
      assertParamExists("updateAccount", "accountId", accountId);
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("updateAccount", "userId", userId);
      // verify required parameter 'updateAccount' is not null or undefined
      assertParamExists("updateAccount", "updateAccount", updateAccount);
      const localVarPath = `/api/users/{user_id}/accounts/{account_id}`
        .replace(`{${"account_id"}}`, encodeURIComponent(String(accountId)))
        .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)));
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "PUT",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      localVarHeaderParameter["Content-Type"] = "application/json";

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };
      localVarRequestOptions.data = serializeDataIfNeeded(
        updateAccount,
        localVarRequestOptions,
        configuration,
      );

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
  };
};

/**
 * AccountsApi - functional programming interface
 * @export
 */
export const AccountsApiFp = function (configuration?: Configuration) {
  const localVarAxiosParamCreator = AccountsApiAxiosParamCreator(configuration);
  return {
    /**
     * Adds a new account to the user.
     * @summary Add Account
     * @param {string} userId
     * @param {UpdateAccount} updateAccount
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async addAccount(
      userId: string,
      updateAccount: UpdateAccount,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<AddAccountResponse>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.addAccount(
        userId,
        updateAccount,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["AccountsApi.addAccount"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Marks account as inactive so that its unavailable anymore.
     * @summary Delete Account
     * @param {string} accountId
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async deleteAccount(
      accountId: string,
      userId: string,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (axios?: AxiosInstance, basePath?: string) => AxiosPromise<void>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.deleteAccount(
        accountId,
        userId,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["AccountsApi.deleteAccount"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Gets a specific account of the user with metadata.
     * @summary Get Account
     * @param {string} accountId
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getAccount(
      accountId: string,
      userId: string,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<GetAccountResponse>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getAccount(
        accountId,
        userId,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["AccountsApi.getAccount"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Retrieves all available account liquidity types
     * @summary Get Account Liquidity Types
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getAccountLiquidityTypes(
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<GetAccountLiquidityTypesResponse>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.getAccountLiquidityTypes(options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["AccountsApi.getAccountLiquidityTypes"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Retrieves all available account types
     * @summary Get Account Types
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getAccountTypes(
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<GetAccountTypesResponse>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.getAccountTypes(options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["AccountsApi.getAccountTypes"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Gets all accounts and its metadata associated with user
     * @summary Get Accounts
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getAccounts(
      userId: string,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<GetAccountsResponse>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getAccounts(
        userId,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["AccountsApi.getAccounts"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Updates a specific account of the user with metadata.
     * @summary Update Account
     * @param {string} accountId
     * @param {string} userId
     * @param {UpdateAccount} updateAccount
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async updateAccount(
      accountId: string,
      userId: string,
      updateAccount: UpdateAccount,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (axios?: AxiosInstance, basePath?: string) => AxiosPromise<UpdateAccount>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.updateAccount(
        accountId,
        userId,
        updateAccount,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["AccountsApi.updateAccount"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
  };
};

/**
 * AccountsApi - factory interface
 * @export
 */
export const AccountsApiFactory = function (
  configuration?: Configuration,
  basePath?: string,
  axios?: AxiosInstance,
) {
  const localVarFp = AccountsApiFp(configuration);
  return {
    /**
     * Adds a new account to the user.
     * @summary Add Account
     * @param {string} userId
     * @param {UpdateAccount} updateAccount
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    addAccount(
      userId: string,
      updateAccount: UpdateAccount,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<AddAccountResponse> {
      return localVarFp
        .addAccount(userId, updateAccount, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Marks account as inactive so that its unavailable anymore.
     * @summary Delete Account
     * @param {string} accountId
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    deleteAccount(
      accountId: string,
      userId: string,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<void> {
      return localVarFp
        .deleteAccount(accountId, userId, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Gets a specific account of the user with metadata.
     * @summary Get Account
     * @param {string} accountId
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getAccount(
      accountId: string,
      userId: string,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<GetAccountResponse> {
      return localVarFp
        .getAccount(accountId, userId, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Retrieves all available account liquidity types
     * @summary Get Account Liquidity Types
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getAccountLiquidityTypes(
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<GetAccountLiquidityTypesResponse> {
      return localVarFp
        .getAccountLiquidityTypes(options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Retrieves all available account types
     * @summary Get Account Types
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getAccountTypes(
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<GetAccountTypesResponse> {
      return localVarFp
        .getAccountTypes(options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Gets all accounts and its metadata associated with user
     * @summary Get Accounts
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getAccounts(
      userId: string,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<GetAccountsResponse> {
      return localVarFp
        .getAccounts(userId, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Updates a specific account of the user with metadata.
     * @summary Update Account
     * @param {string} accountId
     * @param {string} userId
     * @param {UpdateAccount} updateAccount
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    updateAccount(
      accountId: string,
      userId: string,
      updateAccount: UpdateAccount,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<UpdateAccount> {
      return localVarFp
        .updateAccount(accountId, userId, updateAccount, options)
        .then((request) => request(axios, basePath));
    },
  };
};

/**
 * AccountsApi - interface
 * @export
 * @interface AccountsApi
 */
export interface AccountsApiInterface {
  /**
   * Adds a new account to the user.
   * @summary Add Account
   * @param {string} userId
   * @param {UpdateAccount} updateAccount
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AccountsApiInterface
   */
  addAccount(
    userId: string,
    updateAccount: UpdateAccount,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<AddAccountResponse>;

  /**
   * Marks account as inactive so that its unavailable anymore.
   * @summary Delete Account
   * @param {string} accountId
   * @param {string} userId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AccountsApiInterface
   */
  deleteAccount(
    accountId: string,
    userId: string,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<void>;

  /**
   * Gets a specific account of the user with metadata.
   * @summary Get Account
   * @param {string} accountId
   * @param {string} userId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AccountsApiInterface
   */
  getAccount(
    accountId: string,
    userId: string,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<GetAccountResponse>;

  /**
   * Retrieves all available account liquidity types
   * @summary Get Account Liquidity Types
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AccountsApiInterface
   */
  getAccountLiquidityTypes(
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<GetAccountLiquidityTypesResponse>;

  /**
   * Retrieves all available account types
   * @summary Get Account Types
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AccountsApiInterface
   */
  getAccountTypes(
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<GetAccountTypesResponse>;

  /**
   * Gets all accounts and its metadata associated with user
   * @summary Get Accounts
   * @param {string} userId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AccountsApiInterface
   */
  getAccounts(
    userId: string,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<GetAccountsResponse>;

  /**
   * Updates a specific account of the user with metadata.
   * @summary Update Account
   * @param {string} accountId
   * @param {string} userId
   * @param {UpdateAccount} updateAccount
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AccountsApiInterface
   */
  updateAccount(
    accountId: string,
    userId: string,
    updateAccount: UpdateAccount,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<UpdateAccount>;
}

/**
 * AccountsApi - object-oriented interface
 * @export
 * @class AccountsApi
 * @extends {BaseAPI}
 */
export class AccountsApi extends BaseAPI implements AccountsApiInterface {
  /**
   * Adds a new account to the user.
   * @summary Add Account
   * @param {string} userId
   * @param {UpdateAccount} updateAccount
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AccountsApi
   */
  public addAccount(
    userId: string,
    updateAccount: UpdateAccount,
    options?: RawAxiosRequestConfig,
  ) {
    return AccountsApiFp(this.configuration)
      .addAccount(userId, updateAccount, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Marks account as inactive so that its unavailable anymore.
   * @summary Delete Account
   * @param {string} accountId
   * @param {string} userId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AccountsApi
   */
  public deleteAccount(
    accountId: string,
    userId: string,
    options?: RawAxiosRequestConfig,
  ) {
    return AccountsApiFp(this.configuration)
      .deleteAccount(accountId, userId, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Gets a specific account of the user with metadata.
   * @summary Get Account
   * @param {string} accountId
   * @param {string} userId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AccountsApi
   */
  public getAccount(
    accountId: string,
    userId: string,
    options?: RawAxiosRequestConfig,
  ) {
    return AccountsApiFp(this.configuration)
      .getAccount(accountId, userId, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Retrieves all available account liquidity types
   * @summary Get Account Liquidity Types
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AccountsApi
   */
  public getAccountLiquidityTypes(options?: RawAxiosRequestConfig) {
    return AccountsApiFp(this.configuration)
      .getAccountLiquidityTypes(options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Retrieves all available account types
   * @summary Get Account Types
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AccountsApi
   */
  public getAccountTypes(options?: RawAxiosRequestConfig) {
    return AccountsApiFp(this.configuration)
      .getAccountTypes(options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Gets all accounts and its metadata associated with user
   * @summary Get Accounts
   * @param {string} userId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AccountsApi
   */
  public getAccounts(userId: string, options?: RawAxiosRequestConfig) {
    return AccountsApiFp(this.configuration)
      .getAccounts(userId, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Updates a specific account of the user with metadata.
   * @summary Update Account
   * @param {string} accountId
   * @param {string} userId
   * @param {UpdateAccount} updateAccount
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AccountsApi
   */
  public updateAccount(
    accountId: string,
    userId: string,
    updateAccount: UpdateAccount,
    options?: RawAxiosRequestConfig,
  ) {
    return AccountsApiFp(this.configuration)
      .updateAccount(accountId, userId, updateAccount, options)
      .then((request) => request(this.axios, this.basePath));
  }
}

/**
 * AssetsApi - axios parameter creator
 * @export
 */
export const AssetsApiAxiosParamCreator = function (
  configuration?: Configuration,
) {
  return {
    /**
     * Gets a shared asset.
     * @summary Get asset
     * @param {number} assetId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getAsset: async (
      assetId: number,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'assetId' is not null or undefined
      assertParamExists("getAsset", "assetId", assetId);
      const localVarPath = `/api/assets/{asset_id}`.replace(
        `{${"asset_id"}}`,
        encodeURIComponent(String(assetId)),
      );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Gets asset pair and its metadata.
     * @summary Get asset pair
     * @param {number} assetId
     * @param {number} referenceId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getAssetPair: async (
      assetId: number,
      referenceId: number,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'assetId' is not null or undefined
      assertParamExists("getAssetPair", "assetId", assetId);
      // verify required parameter 'referenceId' is not null or undefined
      assertParamExists("getAssetPair", "referenceId", referenceId);
      const localVarPath = `/api/assets/{asset_id}/{reference_id}`
        .replace(`{${"asset_id"}}`, encodeURIComponent(String(assetId)))
        .replace(
          `{${"reference_id"}}`,
          encodeURIComponent(String(referenceId)),
        );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Gets asset pair rates based on provided query params
     * @summary Get asset pair rates
     * @param {number} assetId
     * @param {number} referenceId
     * @param {string} [range]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getAssetPairRates: async (
      assetId: number,
      referenceId: number,
      range?: string,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'assetId' is not null or undefined
      assertParamExists("getAssetPairRates", "assetId", assetId);
      // verify required parameter 'referenceId' is not null or undefined
      assertParamExists("getAssetPairRates", "referenceId", referenceId);
      const localVarPath = `/api/assets/{asset_id}/{reference_id}/rates`
        .replace(`{${"asset_id"}}`, encodeURIComponent(String(assetId)))
        .replace(
          `{${"reference_id"}}`,
          encodeURIComponent(String(referenceId)),
        );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      if (range !== undefined) {
        localVarQueryParameter["range"] = range;
      }

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Retrieves all available asset types
     * @summary Get asset types
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getAssetTypes: async (
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      const localVarPath = `/api/assets/types`;
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Query to search shared assets. Returns a page of results. If no query parameters are provided, returns results sorted by most popular. The equivalent search endpoint for the user assets is not provided, as user assets can be retrieved in full due to it being a small subset.
     * @summary Search assets
     * @param {number} [count]
     * @param {number} [start]
     * @param {string} [query]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    searchAssets: async (
      count?: number,
      start?: number,
      query?: string,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      const localVarPath = `/api/assets`;
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      if (count !== undefined) {
        localVarQueryParameter["count"] = count;
      }

      if (start !== undefined) {
        localVarQueryParameter["start"] = start;
      }

      if (query !== undefined) {
        localVarQueryParameter["query"] = query;
      }

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
  };
};

/**
 * AssetsApi - functional programming interface
 * @export
 */
export const AssetsApiFp = function (configuration?: Configuration) {
  const localVarAxiosParamCreator = AssetsApiAxiosParamCreator(configuration);
  return {
    /**
     * Gets a shared asset.
     * @summary Get asset
     * @param {number} assetId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getAsset(
      assetId: number,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<GetAssetResponse>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getAsset(
        assetId,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["AssetsApi.getAsset"]?.[localVarOperationServerIndex]
          ?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Gets asset pair and its metadata.
     * @summary Get asset pair
     * @param {number} assetId
     * @param {number} referenceId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getAssetPair(
      assetId: number,
      referenceId: number,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<GetAssetPairResponse>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getAssetPair(
        assetId,
        referenceId,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["AssetsApi.getAssetPair"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Gets asset pair rates based on provided query params
     * @summary Get asset pair rates
     * @param {number} assetId
     * @param {number} referenceId
     * @param {string} [range]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getAssetPairRates(
      assetId: number,
      referenceId: number,
      range?: string,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<GetAssetPairRatesResponse>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.getAssetPairRates(
          assetId,
          referenceId,
          range,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["AssetsApi.getAssetPairRates"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Retrieves all available asset types
     * @summary Get asset types
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getAssetTypes(
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<AssetLookupTables>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.getAssetTypes(options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["AssetsApi.getAssetTypes"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Query to search shared assets. Returns a page of results. If no query parameters are provided, returns results sorted by most popular. The equivalent search endpoint for the user assets is not provided, as user assets can be retrieved in full due to it being a small subset.
     * @summary Search assets
     * @param {number} [count]
     * @param {number} [start]
     * @param {string} [query]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async searchAssets(
      count?: number,
      start?: number,
      query?: string,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (axios?: AxiosInstance, basePath?: string) => AxiosPromise<AssetsPage>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.searchAssets(
        count,
        start,
        query,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["AssetsApi.searchAssets"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
  };
};

/**
 * AssetsApi - factory interface
 * @export
 */
export const AssetsApiFactory = function (
  configuration?: Configuration,
  basePath?: string,
  axios?: AxiosInstance,
) {
  const localVarFp = AssetsApiFp(configuration);
  return {
    /**
     * Gets a shared asset.
     * @summary Get asset
     * @param {number} assetId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getAsset(
      assetId: number,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<GetAssetResponse> {
      return localVarFp
        .getAsset(assetId, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Gets asset pair and its metadata.
     * @summary Get asset pair
     * @param {number} assetId
     * @param {number} referenceId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getAssetPair(
      assetId: number,
      referenceId: number,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<GetAssetPairResponse> {
      return localVarFp
        .getAssetPair(assetId, referenceId, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Gets asset pair rates based on provided query params
     * @summary Get asset pair rates
     * @param {number} assetId
     * @param {number} referenceId
     * @param {string} [range]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getAssetPairRates(
      assetId: number,
      referenceId: number,
      range?: string,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<GetAssetPairRatesResponse> {
      return localVarFp
        .getAssetPairRates(assetId, referenceId, range, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Retrieves all available asset types
     * @summary Get asset types
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getAssetTypes(
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<AssetLookupTables> {
      return localVarFp
        .getAssetTypes(options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Query to search shared assets. Returns a page of results. If no query parameters are provided, returns results sorted by most popular. The equivalent search endpoint for the user assets is not provided, as user assets can be retrieved in full due to it being a small subset.
     * @summary Search assets
     * @param {number} [count]
     * @param {number} [start]
     * @param {string} [query]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    searchAssets(
      count?: number,
      start?: number,
      query?: string,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<AssetsPage> {
      return localVarFp
        .searchAssets(count, start, query, options)
        .then((request) => request(axios, basePath));
    },
  };
};

/**
 * AssetsApi - interface
 * @export
 * @interface AssetsApi
 */
export interface AssetsApiInterface {
  /**
   * Gets a shared asset.
   * @summary Get asset
   * @param {number} assetId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AssetsApiInterface
   */
  getAsset(
    assetId: number,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<GetAssetResponse>;

  /**
   * Gets asset pair and its metadata.
   * @summary Get asset pair
   * @param {number} assetId
   * @param {number} referenceId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AssetsApiInterface
   */
  getAssetPair(
    assetId: number,
    referenceId: number,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<GetAssetPairResponse>;

  /**
   * Gets asset pair rates based on provided query params
   * @summary Get asset pair rates
   * @param {number} assetId
   * @param {number} referenceId
   * @param {string} [range]
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AssetsApiInterface
   */
  getAssetPairRates(
    assetId: number,
    referenceId: number,
    range?: string,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<GetAssetPairRatesResponse>;

  /**
   * Retrieves all available asset types
   * @summary Get asset types
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AssetsApiInterface
   */
  getAssetTypes(
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<AssetLookupTables>;

  /**
   * Query to search shared assets. Returns a page of results. If no query parameters are provided, returns results sorted by most popular. The equivalent search endpoint for the user assets is not provided, as user assets can be retrieved in full due to it being a small subset.
   * @summary Search assets
   * @param {number} [count]
   * @param {number} [start]
   * @param {string} [query]
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AssetsApiInterface
   */
  searchAssets(
    count?: number,
    start?: number,
    query?: string,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<AssetsPage>;
}

/**
 * AssetsApi - object-oriented interface
 * @export
 * @class AssetsApi
 * @extends {BaseAPI}
 */
export class AssetsApi extends BaseAPI implements AssetsApiInterface {
  /**
   * Gets a shared asset.
   * @summary Get asset
   * @param {number} assetId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AssetsApi
   */
  public getAsset(assetId: number, options?: RawAxiosRequestConfig) {
    return AssetsApiFp(this.configuration)
      .getAsset(assetId, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Gets asset pair and its metadata.
   * @summary Get asset pair
   * @param {number} assetId
   * @param {number} referenceId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AssetsApi
   */
  public getAssetPair(
    assetId: number,
    referenceId: number,
    options?: RawAxiosRequestConfig,
  ) {
    return AssetsApiFp(this.configuration)
      .getAssetPair(assetId, referenceId, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Gets asset pair rates based on provided query params
   * @summary Get asset pair rates
   * @param {number} assetId
   * @param {number} referenceId
   * @param {string} [range]
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AssetsApi
   */
  public getAssetPairRates(
    assetId: number,
    referenceId: number,
    range?: string,
    options?: RawAxiosRequestConfig,
  ) {
    return AssetsApiFp(this.configuration)
      .getAssetPairRates(assetId, referenceId, range, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Retrieves all available asset types
   * @summary Get asset types
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AssetsApi
   */
  public getAssetTypes(options?: RawAxiosRequestConfig) {
    return AssetsApiFp(this.configuration)
      .getAssetTypes(options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Query to search shared assets. Returns a page of results. If no query parameters are provided, returns results sorted by most popular. The equivalent search endpoint for the user assets is not provided, as user assets can be retrieved in full due to it being a small subset.
   * @summary Search assets
   * @param {number} [count]
   * @param {number} [start]
   * @param {string} [query]
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AssetsApi
   */
  public searchAssets(
    count?: number,
    start?: number,
    query?: string,
    options?: RawAxiosRequestConfig,
  ) {
    return AssetsApiFp(this.configuration)
      .searchAssets(count, start, query, options)
      .then((request) => request(this.axios, this.basePath));
  }
}

/**
 * AuthenticationApi - axios parameter creator
 * @export
 */
export const AuthenticationApiAxiosParamCreator = function (
  configuration?: Configuration,
) {
  return {
    /**
     * Returns the authenticated user\'s identity, role, and metadata.
     * @summary Get current user
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getMe: async (
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      const localVarPath = `/api/auth/me`;
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Posting login details to this query will return an authentication token used in most of the requests.
     * @summary Authenticate
     * @param {LoginDetails} loginDetails
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    postLoginDetails: async (
      loginDetails: LoginDetails,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'loginDetails' is not null or undefined
      assertParamExists("postLoginDetails", "loginDetails", loginDetails);
      const localVarPath = `/api/auth`;
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "POST",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      localVarHeaderParameter["Content-Type"] = "application/json";

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };
      localVarRequestOptions.data = serializeDataIfNeeded(
        loginDetails,
        localVarRequestOptions,
        configuration,
      );

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Revokes all refresh tokens for the authenticated user and clears the refresh token cookie.
     * @summary Logout
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    postLogout: async (
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      const localVarPath = `/api/auth/logout`;
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "POST",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Uses the httpOnly refresh_token cookie to issue a new access token and rotate the refresh token.
     * @summary Refresh access token
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    postRefreshToken: async (
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      const localVarPath = `/api/auth/refresh`;
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "POST",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
  };
};

/**
 * AuthenticationApi - functional programming interface
 * @export
 */
export const AuthenticationApiFp = function (configuration?: Configuration) {
  const localVarAxiosParamCreator =
    AuthenticationApiAxiosParamCreator(configuration);
  return {
    /**
     * Returns the authenticated user\'s identity, role, and metadata.
     * @summary Get current user
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getMe(
      options?: RawAxiosRequestConfig,
    ): Promise<
      (axios?: AxiosInstance, basePath?: string) => AxiosPromise<AuthMe>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getMe(options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["AuthenticationApi.getMe"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Posting login details to this query will return an authentication token used in most of the requests.
     * @summary Authenticate
     * @param {LoginDetails} loginDetails
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async postLoginDetails(
      loginDetails: LoginDetails,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (axios?: AxiosInstance, basePath?: string) => AxiosPromise<Auth>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.postLoginDetails(loginDetails, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["AuthenticationApi.postLoginDetails"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Revokes all refresh tokens for the authenticated user and clears the refresh token cookie.
     * @summary Logout
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async postLogout(
      options?: RawAxiosRequestConfig,
    ): Promise<
      (axios?: AxiosInstance, basePath?: string) => AxiosPromise<void>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.postLogout(options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["AuthenticationApi.postLogout"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Uses the httpOnly refresh_token cookie to issue a new access token and rotate the refresh token.
     * @summary Refresh access token
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async postRefreshToken(
      options?: RawAxiosRequestConfig,
    ): Promise<
      (axios?: AxiosInstance, basePath?: string) => AxiosPromise<Auth>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.postRefreshToken(options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["AuthenticationApi.postRefreshToken"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
  };
};

/**
 * AuthenticationApi - factory interface
 * @export
 */
export const AuthenticationApiFactory = function (
  configuration?: Configuration,
  basePath?: string,
  axios?: AxiosInstance,
) {
  const localVarFp = AuthenticationApiFp(configuration);
  return {
    /**
     * Returns the authenticated user\'s identity, role, and metadata.
     * @summary Get current user
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getMe(options?: RawAxiosRequestConfig): AxiosPromise<AuthMe> {
      return localVarFp
        .getMe(options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Posting login details to this query will return an authentication token used in most of the requests.
     * @summary Authenticate
     * @param {LoginDetails} loginDetails
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    postLoginDetails(
      loginDetails: LoginDetails,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<Auth> {
      return localVarFp
        .postLoginDetails(loginDetails, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Revokes all refresh tokens for the authenticated user and clears the refresh token cookie.
     * @summary Logout
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    postLogout(options?: RawAxiosRequestConfig): AxiosPromise<void> {
      return localVarFp
        .postLogout(options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Uses the httpOnly refresh_token cookie to issue a new access token and rotate the refresh token.
     * @summary Refresh access token
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    postRefreshToken(options?: RawAxiosRequestConfig): AxiosPromise<Auth> {
      return localVarFp
        .postRefreshToken(options)
        .then((request) => request(axios, basePath));
    },
  };
};

/**
 * AuthenticationApi - interface
 * @export
 * @interface AuthenticationApi
 */
export interface AuthenticationApiInterface {
  /**
   * Returns the authenticated user\'s identity, role, and metadata.
   * @summary Get current user
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AuthenticationApiInterface
   */
  getMe(options?: RawAxiosRequestConfig): AxiosPromise<AuthMe>;

  /**
   * Posting login details to this query will return an authentication token used in most of the requests.
   * @summary Authenticate
   * @param {LoginDetails} loginDetails
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AuthenticationApiInterface
   */
  postLoginDetails(
    loginDetails: LoginDetails,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<Auth>;

  /**
   * Revokes all refresh tokens for the authenticated user and clears the refresh token cookie.
   * @summary Logout
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AuthenticationApiInterface
   */
  postLogout(options?: RawAxiosRequestConfig): AxiosPromise<void>;

  /**
   * Uses the httpOnly refresh_token cookie to issue a new access token and rotate the refresh token.
   * @summary Refresh access token
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AuthenticationApiInterface
   */
  postRefreshToken(options?: RawAxiosRequestConfig): AxiosPromise<Auth>;
}

/**
 * AuthenticationApi - object-oriented interface
 * @export
 * @class AuthenticationApi
 * @extends {BaseAPI}
 */
export class AuthenticationApi
  extends BaseAPI
  implements AuthenticationApiInterface
{
  /**
   * Returns the authenticated user\'s identity, role, and metadata.
   * @summary Get current user
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AuthenticationApi
   */
  public getMe(options?: RawAxiosRequestConfig) {
    return AuthenticationApiFp(this.configuration)
      .getMe(options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Posting login details to this query will return an authentication token used in most of the requests.
   * @summary Authenticate
   * @param {LoginDetails} loginDetails
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AuthenticationApi
   */
  public postLoginDetails(
    loginDetails: LoginDetails,
    options?: RawAxiosRequestConfig,
  ) {
    return AuthenticationApiFp(this.configuration)
      .postLoginDetails(loginDetails, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Revokes all refresh tokens for the authenticated user and clears the refresh token cookie.
   * @summary Logout
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AuthenticationApi
   */
  public postLogout(options?: RawAxiosRequestConfig) {
    return AuthenticationApiFp(this.configuration)
      .postLogout(options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Uses the httpOnly refresh_token cookie to issue a new access token and rotate the refresh token.
   * @summary Refresh access token
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof AuthenticationApi
   */
  public postRefreshToken(options?: RawAxiosRequestConfig) {
    return AuthenticationApiFp(this.configuration)
      .postRefreshToken(options)
      .then((request) => request(this.axios, this.basePath));
  }
}

/**
 * CategoriesApi - axios parameter creator
 * @export
 */
export const CategoriesApiAxiosParamCreator = function (
  configuration?: Configuration,
) {
  return {
    /**
     * Retrieves all shared category types. Does not include user-specific category types.
     * @summary Get Category Types
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getCategoryTypes: async (
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      const localVarPath = `/api/categories/types`;
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Retrieves a paginated list of categories accessible to the user. Includes both global categories and user-specific categories. Supports searching by category name or type name, and filtering by type ID.
     * @summary Search Categories
     * @param {number} [count]
     * @param {number} [start]
     * @param {string} [query]
     * @param {number} [typeId] Filter by category type ID
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    searchCategories: async (
      count?: number,
      start?: number,
      query?: string,
      typeId?: number,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      const localVarPath = `/api/categories`;
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      if (count !== undefined) {
        localVarQueryParameter["count"] = count;
      }

      if (start !== undefined) {
        localVarQueryParameter["start"] = start;
      }

      if (query !== undefined) {
        localVarQueryParameter["query"] = query;
      }

      if (typeId !== undefined) {
        localVarQueryParameter["type_id"] = typeId;
      }

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
  };
};

/**
 * CategoriesApi - functional programming interface
 * @export
 */
export const CategoriesApiFp = function (configuration?: Configuration) {
  const localVarAxiosParamCreator =
    CategoriesApiAxiosParamCreator(configuration);
  return {
    /**
     * Retrieves all shared category types. Does not include user-specific category types.
     * @summary Get Category Types
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getCategoryTypes(
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<CategoryMetadataLookupTables>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.getCategoryTypes(options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["CategoriesApi.getCategoryTypes"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Retrieves a paginated list of categories accessible to the user. Includes both global categories and user-specific categories. Supports searching by category name or type name, and filtering by type ID.
     * @summary Search Categories
     * @param {number} [count]
     * @param {number} [start]
     * @param {string} [query]
     * @param {number} [typeId] Filter by category type ID
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async searchCategories(
      count?: number,
      start?: number,
      query?: string,
      typeId?: number,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<SearchCategoriesResponse>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.searchCategories(
          count,
          start,
          query,
          typeId,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["CategoriesApi.searchCategories"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
  };
};

/**
 * CategoriesApi - factory interface
 * @export
 */
export const CategoriesApiFactory = function (
  configuration?: Configuration,
  basePath?: string,
  axios?: AxiosInstance,
) {
  const localVarFp = CategoriesApiFp(configuration);
  return {
    /**
     * Retrieves all shared category types. Does not include user-specific category types.
     * @summary Get Category Types
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getCategoryTypes(
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<CategoryMetadataLookupTables> {
      return localVarFp
        .getCategoryTypes(options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Retrieves a paginated list of categories accessible to the user. Includes both global categories and user-specific categories. Supports searching by category name or type name, and filtering by type ID.
     * @summary Search Categories
     * @param {number} [count]
     * @param {number} [start]
     * @param {string} [query]
     * @param {number} [typeId] Filter by category type ID
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    searchCategories(
      count?: number,
      start?: number,
      query?: string,
      typeId?: number,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<SearchCategoriesResponse> {
      return localVarFp
        .searchCategories(count, start, query, typeId, options)
        .then((request) => request(axios, basePath));
    },
  };
};

/**
 * CategoriesApi - interface
 * @export
 * @interface CategoriesApi
 */
export interface CategoriesApiInterface {
  /**
   * Retrieves all shared category types. Does not include user-specific category types.
   * @summary Get Category Types
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof CategoriesApiInterface
   */
  getCategoryTypes(
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<CategoryMetadataLookupTables>;

  /**
   * Retrieves a paginated list of categories accessible to the user. Includes both global categories and user-specific categories. Supports searching by category name or type name, and filtering by type ID.
   * @summary Search Categories
   * @param {number} [count]
   * @param {number} [start]
   * @param {string} [query]
   * @param {number} [typeId] Filter by category type ID
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof CategoriesApiInterface
   */
  searchCategories(
    count?: number,
    start?: number,
    query?: string,
    typeId?: number,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<SearchCategoriesResponse>;
}

/**
 * CategoriesApi - object-oriented interface
 * @export
 * @class CategoriesApi
 * @extends {BaseAPI}
 */
export class CategoriesApi extends BaseAPI implements CategoriesApiInterface {
  /**
   * Retrieves all shared category types. Does not include user-specific category types.
   * @summary Get Category Types
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof CategoriesApi
   */
  public getCategoryTypes(options?: RawAxiosRequestConfig) {
    return CategoriesApiFp(this.configuration)
      .getCategoryTypes(options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Retrieves a paginated list of categories accessible to the user. Includes both global categories and user-specific categories. Supports searching by category name or type name, and filtering by type ID.
   * @summary Search Categories
   * @param {number} [count]
   * @param {number} [start]
   * @param {string} [query]
   * @param {number} [typeId] Filter by category type ID
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof CategoriesApi
   */
  public searchCategories(
    count?: number,
    start?: number,
    query?: string,
    typeId?: number,
    options?: RawAxiosRequestConfig,
  ) {
    return CategoriesApiFp(this.configuration)
      .searchCategories(count, start, query, typeId, options)
      .then((request) => request(this.axios, this.basePath));
  }
}

/**
 * FilesApi - axios parameter creator
 * @export
 */
export const FilesApiAxiosParamCreator = function (
  configuration?: Configuration,
) {
  return {
    /**
     * Transitions file to processing and triggers background verification.
     * @summary Confirm File Upload
     * @param {string} userId
     * @param {string} fileId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    confirmFile: async (
      userId: string,
      fileId: string,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("confirmFile", "userId", userId);
      // verify required parameter 'fileId' is not null or undefined
      assertParamExists("confirmFile", "fileId", fileId);
      const localVarPath = `/api/users/{user_id}/files/{file_id}/confirm`
        .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)))
        .replace(`{${"file_id"}}`, encodeURIComponent(String(fileId)));
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "POST",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Creates a new file record and returns a presigned upload URL.
     * @summary Create File
     * @param {string} userId
     * @param {CreateFileRequest} createFileRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    createFile: async (
      userId: string,
      createFileRequest: CreateFileRequest,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("createFile", "userId", userId);
      // verify required parameter 'createFileRequest' is not null or undefined
      assertParamExists("createFile", "createFileRequest", createFileRequest);
      const localVarPath = `/api/users/{user_id}/files`.replace(
        `{${"user_id"}}`,
        encodeURIComponent(String(userId)),
      );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "POST",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      localVarHeaderParameter["Content-Type"] = "application/json";

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };
      localVarRequestOptions.data = serializeDataIfNeeded(
        createFileRequest,
        localVarRequestOptions,
        configuration,
      );

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Deletes a file record and associated storage objects.
     * @summary Delete File
     * @param {string} userId
     * @param {string} fileId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    deleteFile: async (
      userId: string,
      fileId: string,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("deleteFile", "userId", userId);
      // verify required parameter 'fileId' is not null or undefined
      assertParamExists("deleteFile", "fileId", fileId);
      const localVarPath = `/api/users/{user_id}/files/{file_id}`
        .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)))
        .replace(`{${"file_id"}}`, encodeURIComponent(String(fileId)));
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "DELETE",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Retrieves a single file record.
     * @summary Get File
     * @param {string} userId
     * @param {string} fileId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getFile: async (
      userId: string,
      fileId: string,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("getFile", "userId", userId);
      // verify required parameter 'fileId' is not null or undefined
      assertParamExists("getFile", "fileId", fileId);
      const localVarPath = `/api/users/{user_id}/files/{file_id}`
        .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)))
        .replace(`{${"file_id"}}`, encodeURIComponent(String(fileId)));
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Returns a signed URL for the file thumbnail.
     * @summary Get File Thumbnail URL
     * @param {string} userId
     * @param {string} fileId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getFileThumbnail: async (
      userId: string,
      fileId: string,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("getFileThumbnail", "userId", userId);
      // verify required parameter 'fileId' is not null or undefined
      assertParamExists("getFileThumbnail", "fileId", fileId);
      const localVarPath = `/api/users/{user_id}/files/{file_id}/thumbnail`
        .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)))
        .replace(`{${"file_id"}}`, encodeURIComponent(String(fileId)));
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Returns a signed download URL for the file.
     * @summary Get File Download URL
     * @param {string} userId
     * @param {string} fileId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getFileUrl: async (
      userId: string,
      fileId: string,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("getFileUrl", "userId", userId);
      // verify required parameter 'fileId' is not null or undefined
      assertParamExists("getFileUrl", "fileId", fileId);
      const localVarPath = `/api/users/{user_id}/files/{file_id}/url`
        .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)))
        .replace(`{${"file_id"}}`, encodeURIComponent(String(fileId)));
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
  };
};

/**
 * FilesApi - functional programming interface
 * @export
 */
export const FilesApiFp = function (configuration?: Configuration) {
  const localVarAxiosParamCreator = FilesApiAxiosParamCreator(configuration);
  return {
    /**
     * Transitions file to processing and triggers background verification.
     * @summary Confirm File Upload
     * @param {string} userId
     * @param {string} fileId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async confirmFile(
      userId: string,
      fileId: string,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<ConfirmFileResponse>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.confirmFile(
        userId,
        fileId,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["FilesApi.confirmFile"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Creates a new file record and returns a presigned upload URL.
     * @summary Create File
     * @param {string} userId
     * @param {CreateFileRequest} createFileRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async createFile(
      userId: string,
      createFileRequest: CreateFileRequest,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<CreateFileResponse>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.createFile(
        userId,
        createFileRequest,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["FilesApi.createFile"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Deletes a file record and associated storage objects.
     * @summary Delete File
     * @param {string} userId
     * @param {string} fileId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async deleteFile(
      userId: string,
      fileId: string,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (axios?: AxiosInstance, basePath?: string) => AxiosPromise<void>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.deleteFile(
        userId,
        fileId,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["FilesApi.deleteFile"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Retrieves a single file record.
     * @summary Get File
     * @param {string} userId
     * @param {string} fileId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getFile(
      userId: string,
      fileId: string,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<GetFileResponse>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getFile(
        userId,
        fileId,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["FilesApi.getFile"]?.[localVarOperationServerIndex]
          ?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Returns a signed URL for the file thumbnail.
     * @summary Get File Thumbnail URL
     * @param {string} userId
     * @param {string} fileId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getFileThumbnail(
      userId: string,
      fileId: string,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<FileUrlResponse>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.getFileThumbnail(
          userId,
          fileId,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["FilesApi.getFileThumbnail"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Returns a signed download URL for the file.
     * @summary Get File Download URL
     * @param {string} userId
     * @param {string} fileId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getFileUrl(
      userId: string,
      fileId: string,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<FileUrlResponse>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getFileUrl(
        userId,
        fileId,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["FilesApi.getFileUrl"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
  };
};

/**
 * FilesApi - factory interface
 * @export
 */
export const FilesApiFactory = function (
  configuration?: Configuration,
  basePath?: string,
  axios?: AxiosInstance,
) {
  const localVarFp = FilesApiFp(configuration);
  return {
    /**
     * Transitions file to processing and triggers background verification.
     * @summary Confirm File Upload
     * @param {string} userId
     * @param {string} fileId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    confirmFile(
      userId: string,
      fileId: string,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<ConfirmFileResponse> {
      return localVarFp
        .confirmFile(userId, fileId, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Creates a new file record and returns a presigned upload URL.
     * @summary Create File
     * @param {string} userId
     * @param {CreateFileRequest} createFileRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    createFile(
      userId: string,
      createFileRequest: CreateFileRequest,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<CreateFileResponse> {
      return localVarFp
        .createFile(userId, createFileRequest, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Deletes a file record and associated storage objects.
     * @summary Delete File
     * @param {string} userId
     * @param {string} fileId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    deleteFile(
      userId: string,
      fileId: string,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<void> {
      return localVarFp
        .deleteFile(userId, fileId, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Retrieves a single file record.
     * @summary Get File
     * @param {string} userId
     * @param {string} fileId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getFile(
      userId: string,
      fileId: string,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<GetFileResponse> {
      return localVarFp
        .getFile(userId, fileId, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Returns a signed URL for the file thumbnail.
     * @summary Get File Thumbnail URL
     * @param {string} userId
     * @param {string} fileId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getFileThumbnail(
      userId: string,
      fileId: string,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<FileUrlResponse> {
      return localVarFp
        .getFileThumbnail(userId, fileId, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Returns a signed download URL for the file.
     * @summary Get File Download URL
     * @param {string} userId
     * @param {string} fileId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getFileUrl(
      userId: string,
      fileId: string,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<FileUrlResponse> {
      return localVarFp
        .getFileUrl(userId, fileId, options)
        .then((request) => request(axios, basePath));
    },
  };
};

/**
 * FilesApi - interface
 * @export
 * @interface FilesApi
 */
export interface FilesApiInterface {
  /**
   * Transitions file to processing and triggers background verification.
   * @summary Confirm File Upload
   * @param {string} userId
   * @param {string} fileId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof FilesApiInterface
   */
  confirmFile(
    userId: string,
    fileId: string,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<ConfirmFileResponse>;

  /**
   * Creates a new file record and returns a presigned upload URL.
   * @summary Create File
   * @param {string} userId
   * @param {CreateFileRequest} createFileRequest
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof FilesApiInterface
   */
  createFile(
    userId: string,
    createFileRequest: CreateFileRequest,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<CreateFileResponse>;

  /**
   * Deletes a file record and associated storage objects.
   * @summary Delete File
   * @param {string} userId
   * @param {string} fileId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof FilesApiInterface
   */
  deleteFile(
    userId: string,
    fileId: string,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<void>;

  /**
   * Retrieves a single file record.
   * @summary Get File
   * @param {string} userId
   * @param {string} fileId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof FilesApiInterface
   */
  getFile(
    userId: string,
    fileId: string,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<GetFileResponse>;

  /**
   * Returns a signed URL for the file thumbnail.
   * @summary Get File Thumbnail URL
   * @param {string} userId
   * @param {string} fileId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof FilesApiInterface
   */
  getFileThumbnail(
    userId: string,
    fileId: string,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<FileUrlResponse>;

  /**
   * Returns a signed download URL for the file.
   * @summary Get File Download URL
   * @param {string} userId
   * @param {string} fileId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof FilesApiInterface
   */
  getFileUrl(
    userId: string,
    fileId: string,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<FileUrlResponse>;
}

/**
 * FilesApi - object-oriented interface
 * @export
 * @class FilesApi
 * @extends {BaseAPI}
 */
export class FilesApi extends BaseAPI implements FilesApiInterface {
  /**
   * Transitions file to processing and triggers background verification.
   * @summary Confirm File Upload
   * @param {string} userId
   * @param {string} fileId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof FilesApi
   */
  public confirmFile(
    userId: string,
    fileId: string,
    options?: RawAxiosRequestConfig,
  ) {
    return FilesApiFp(this.configuration)
      .confirmFile(userId, fileId, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Creates a new file record and returns a presigned upload URL.
   * @summary Create File
   * @param {string} userId
   * @param {CreateFileRequest} createFileRequest
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof FilesApi
   */
  public createFile(
    userId: string,
    createFileRequest: CreateFileRequest,
    options?: RawAxiosRequestConfig,
  ) {
    return FilesApiFp(this.configuration)
      .createFile(userId, createFileRequest, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Deletes a file record and associated storage objects.
   * @summary Delete File
   * @param {string} userId
   * @param {string} fileId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof FilesApi
   */
  public deleteFile(
    userId: string,
    fileId: string,
    options?: RawAxiosRequestConfig,
  ) {
    return FilesApiFp(this.configuration)
      .deleteFile(userId, fileId, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Retrieves a single file record.
   * @summary Get File
   * @param {string} userId
   * @param {string} fileId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof FilesApi
   */
  public getFile(
    userId: string,
    fileId: string,
    options?: RawAxiosRequestConfig,
  ) {
    return FilesApiFp(this.configuration)
      .getFile(userId, fileId, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Returns a signed URL for the file thumbnail.
   * @summary Get File Thumbnail URL
   * @param {string} userId
   * @param {string} fileId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof FilesApi
   */
  public getFileThumbnail(
    userId: string,
    fileId: string,
    options?: RawAxiosRequestConfig,
  ) {
    return FilesApiFp(this.configuration)
      .getFileThumbnail(userId, fileId, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Returns a signed download URL for the file.
   * @summary Get File Download URL
   * @param {string} userId
   * @param {string} fileId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof FilesApi
   */
  public getFileUrl(
    userId: string,
    fileId: string,
    options?: RawAxiosRequestConfig,
  ) {
    return FilesApiFp(this.configuration)
      .getFileUrl(userId, fileId, options)
      .then((request) => request(this.axios, this.basePath));
  }
}

/**
 * IndividualTransactionsApi - axios parameter creator
 * @export
 */
export const IndividualTransactionsApiAxiosParamCreator = function (
  configuration?: Configuration,
) {
  return {
    /**
     * Adds a new individual transaction.
     * @summary Add new
     * @param {string} userId
     * @param {AddIndividualTransactionRequest} addIndividualTransactionRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    addIndividualTransaction: async (
      userId: string,
      addIndividualTransactionRequest: AddIndividualTransactionRequest,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("addIndividualTransaction", "userId", userId);
      // verify required parameter 'addIndividualTransactionRequest' is not null or undefined
      assertParamExists(
        "addIndividualTransaction",
        "addIndividualTransactionRequest",
        addIndividualTransactionRequest,
      );
      const localVarPath =
        `/api/users/{user_id}/transactions/individual`.replace(
          `{${"user_id"}}`,
          encodeURIComponent(String(userId)),
        );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "POST",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      localVarHeaderParameter["Content-Type"] = "application/json";

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };
      localVarRequestOptions.data = serializeDataIfNeeded(
        addIndividualTransactionRequest,
        localVarRequestOptions,
        configuration,
      );

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Retrieves a list of all individual transactions
     * @summary Get all
     * @param {string} userId
     * @param {number} [limit]
     * @param {string} [cursor]
     * @param {number} [start]
     * @param {number} [count]
     * @param {string} [query]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getIndividualTransactions: async (
      userId: string,
      limit?: number,
      cursor?: string,
      start?: number,
      count?: number,
      query?: string,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("getIndividualTransactions", "userId", userId);
      const localVarPath =
        `/api/users/{user_id}/transactions/individual`.replace(
          `{${"user_id"}}`,
          encodeURIComponent(String(userId)),
        );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      if (limit !== undefined) {
        localVarQueryParameter["limit"] = limit;
      }

      if (cursor !== undefined) {
        localVarQueryParameter["cursor"] = cursor;
      }

      if (start !== undefined) {
        localVarQueryParameter["start"] = start;
      }

      if (count !== undefined) {
        localVarQueryParameter["count"] = count;
      }

      if (query !== undefined) {
        localVarQueryParameter["query"] = query;
      }

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Retrieves a single transaction by specified id
     * @summary Get Single
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getSingle: async (
      userId: string,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("getSingle", "userId", userId);
      const localVarPath =
        `/api/users/{user_id}/transactions/individual/{transaction_id}`.replace(
          `{${"user_id"}}`,
          encodeURIComponent(String(userId)),
        );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Performs an update of an individual transaction. If the transaction provided is not individual, it will be moved to individual and removed from other group.
     * @summary Update existing
     * @param {string} userId
     * @param {string} transactionId
     * @param {UpdateTransactionRequest} updateTransactionRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    updateAnExistingIndividualTransaction: async (
      userId: string,
      transactionId: string,
      updateTransactionRequest: UpdateTransactionRequest,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists(
        "updateAnExistingIndividualTransaction",
        "userId",
        userId,
      );
      // verify required parameter 'transactionId' is not null or undefined
      assertParamExists(
        "updateAnExistingIndividualTransaction",
        "transactionId",
        transactionId,
      );
      // verify required parameter 'updateTransactionRequest' is not null or undefined
      assertParamExists(
        "updateAnExistingIndividualTransaction",
        "updateTransactionRequest",
        updateTransactionRequest,
      );
      const localVarPath =
        `/api/users/{user_id}/transactions/individual/{transaction_id}`
          .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)))
          .replace(
            `{${"transaction_id"}}`,
            encodeURIComponent(String(transactionId)),
          );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "PUT",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      localVarHeaderParameter["Content-Type"] = "application/json";

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };
      localVarRequestOptions.data = serializeDataIfNeeded(
        updateTransactionRequest,
        localVarRequestOptions,
        configuration,
      );

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
  };
};

/**
 * IndividualTransactionsApi - functional programming interface
 * @export
 */
export const IndividualTransactionsApiFp = function (
  configuration?: Configuration,
) {
  const localVarAxiosParamCreator =
    IndividualTransactionsApiAxiosParamCreator(configuration);
  return {
    /**
     * Adds a new individual transaction.
     * @summary Add new
     * @param {string} userId
     * @param {AddIndividualTransactionRequest} addIndividualTransactionRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async addIndividualTransaction(
      userId: string,
      addIndividualTransactionRequest: AddIndividualTransactionRequest,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<AddIndividualTransactionResponse>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.addIndividualTransaction(
          userId,
          addIndividualTransactionRequest,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap[
          "IndividualTransactionsApi.addIndividualTransaction"
        ]?.[localVarOperationServerIndex]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Retrieves a list of all individual transactions
     * @summary Get all
     * @param {string} userId
     * @param {number} [limit]
     * @param {string} [cursor]
     * @param {number} [start]
     * @param {number} [count]
     * @param {string} [query]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getIndividualTransactions(
      userId: string,
      limit?: number,
      cursor?: string,
      start?: number,
      count?: number,
      query?: string,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<IndividualTransactionsPage>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.getIndividualTransactions(
          userId,
          limit,
          cursor,
          start,
          count,
          query,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap[
          "IndividualTransactionsApi.getIndividualTransactions"
        ]?.[localVarOperationServerIndex]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Retrieves a single transaction by specified id
     * @summary Get Single
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getSingle(
      userId: string,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<GetIndividualTransaction>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getSingle(
        userId,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["IndividualTransactionsApi.getSingle"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Performs an update of an individual transaction. If the transaction provided is not individual, it will be moved to individual and removed from other group.
     * @summary Update existing
     * @param {string} userId
     * @param {string} transactionId
     * @param {UpdateTransactionRequest} updateTransactionRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async updateAnExistingIndividualTransaction(
      userId: string,
      transactionId: string,
      updateTransactionRequest: UpdateTransactionRequest,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<UpdateTransactionResponse>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.updateAnExistingIndividualTransaction(
          userId,
          transactionId,
          updateTransactionRequest,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap[
          "IndividualTransactionsApi.updateAnExistingIndividualTransaction"
        ]?.[localVarOperationServerIndex]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
  };
};

/**
 * IndividualTransactionsApi - factory interface
 * @export
 */
export const IndividualTransactionsApiFactory = function (
  configuration?: Configuration,
  basePath?: string,
  axios?: AxiosInstance,
) {
  const localVarFp = IndividualTransactionsApiFp(configuration);
  return {
    /**
     * Adds a new individual transaction.
     * @summary Add new
     * @param {string} userId
     * @param {AddIndividualTransactionRequest} addIndividualTransactionRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    addIndividualTransaction(
      userId: string,
      addIndividualTransactionRequest: AddIndividualTransactionRequest,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<AddIndividualTransactionResponse> {
      return localVarFp
        .addIndividualTransaction(
          userId,
          addIndividualTransactionRequest,
          options,
        )
        .then((request) => request(axios, basePath));
    },
    /**
     * Retrieves a list of all individual transactions
     * @summary Get all
     * @param {string} userId
     * @param {number} [limit]
     * @param {string} [cursor]
     * @param {number} [start]
     * @param {number} [count]
     * @param {string} [query]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getIndividualTransactions(
      userId: string,
      limit?: number,
      cursor?: string,
      start?: number,
      count?: number,
      query?: string,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<IndividualTransactionsPage> {
      return localVarFp
        .getIndividualTransactions(
          userId,
          limit,
          cursor,
          start,
          count,
          query,
          options,
        )
        .then((request) => request(axios, basePath));
    },
    /**
     * Retrieves a single transaction by specified id
     * @summary Get Single
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getSingle(
      userId: string,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<GetIndividualTransaction> {
      return localVarFp
        .getSingle(userId, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Performs an update of an individual transaction. If the transaction provided is not individual, it will be moved to individual and removed from other group.
     * @summary Update existing
     * @param {string} userId
     * @param {string} transactionId
     * @param {UpdateTransactionRequest} updateTransactionRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    updateAnExistingIndividualTransaction(
      userId: string,
      transactionId: string,
      updateTransactionRequest: UpdateTransactionRequest,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<UpdateTransactionResponse> {
      return localVarFp
        .updateAnExistingIndividualTransaction(
          userId,
          transactionId,
          updateTransactionRequest,
          options,
        )
        .then((request) => request(axios, basePath));
    },
  };
};

/**
 * IndividualTransactionsApi - interface
 * @export
 * @interface IndividualTransactionsApi
 */
export interface IndividualTransactionsApiInterface {
  /**
   * Adds a new individual transaction.
   * @summary Add new
   * @param {string} userId
   * @param {AddIndividualTransactionRequest} addIndividualTransactionRequest
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof IndividualTransactionsApiInterface
   */
  addIndividualTransaction(
    userId: string,
    addIndividualTransactionRequest: AddIndividualTransactionRequest,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<AddIndividualTransactionResponse>;

  /**
   * Retrieves a list of all individual transactions
   * @summary Get all
   * @param {string} userId
   * @param {number} [limit]
   * @param {string} [cursor]
   * @param {number} [start]
   * @param {number} [count]
   * @param {string} [query]
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof IndividualTransactionsApiInterface
   */
  getIndividualTransactions(
    userId: string,
    limit?: number,
    cursor?: string,
    start?: number,
    count?: number,
    query?: string,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<IndividualTransactionsPage>;

  /**
   * Retrieves a single transaction by specified id
   * @summary Get Single
   * @param {string} userId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof IndividualTransactionsApiInterface
   */
  getSingle(
    userId: string,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<GetIndividualTransaction>;

  /**
   * Performs an update of an individual transaction. If the transaction provided is not individual, it will be moved to individual and removed from other group.
   * @summary Update existing
   * @param {string} userId
   * @param {string} transactionId
   * @param {UpdateTransactionRequest} updateTransactionRequest
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof IndividualTransactionsApiInterface
   */
  updateAnExistingIndividualTransaction(
    userId: string,
    transactionId: string,
    updateTransactionRequest: UpdateTransactionRequest,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<UpdateTransactionResponse>;
}

/**
 * IndividualTransactionsApi - object-oriented interface
 * @export
 * @class IndividualTransactionsApi
 * @extends {BaseAPI}
 */
export class IndividualTransactionsApi
  extends BaseAPI
  implements IndividualTransactionsApiInterface
{
  /**
   * Adds a new individual transaction.
   * @summary Add new
   * @param {string} userId
   * @param {AddIndividualTransactionRequest} addIndividualTransactionRequest
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof IndividualTransactionsApi
   */
  public addIndividualTransaction(
    userId: string,
    addIndividualTransactionRequest: AddIndividualTransactionRequest,
    options?: RawAxiosRequestConfig,
  ) {
    return IndividualTransactionsApiFp(this.configuration)
      .addIndividualTransaction(
        userId,
        addIndividualTransactionRequest,
        options,
      )
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Retrieves a list of all individual transactions
   * @summary Get all
   * @param {string} userId
   * @param {number} [limit]
   * @param {string} [cursor]
   * @param {number} [start]
   * @param {number} [count]
   * @param {string} [query]
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof IndividualTransactionsApi
   */
  public getIndividualTransactions(
    userId: string,
    limit?: number,
    cursor?: string,
    start?: number,
    count?: number,
    query?: string,
    options?: RawAxiosRequestConfig,
  ) {
    return IndividualTransactionsApiFp(this.configuration)
      .getIndividualTransactions(
        userId,
        limit,
        cursor,
        start,
        count,
        query,
        options,
      )
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Retrieves a single transaction by specified id
   * @summary Get Single
   * @param {string} userId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof IndividualTransactionsApi
   */
  public getSingle(userId: string, options?: RawAxiosRequestConfig) {
    return IndividualTransactionsApiFp(this.configuration)
      .getSingle(userId, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Performs an update of an individual transaction. If the transaction provided is not individual, it will be moved to individual and removed from other group.
   * @summary Update existing
   * @param {string} userId
   * @param {string} transactionId
   * @param {UpdateTransactionRequest} updateTransactionRequest
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof IndividualTransactionsApi
   */
  public updateAnExistingIndividualTransaction(
    userId: string,
    transactionId: string,
    updateTransactionRequest: UpdateTransactionRequest,
    options?: RawAxiosRequestConfig,
  ) {
    return IndividualTransactionsApiFp(this.configuration)
      .updateAnExistingIndividualTransaction(
        userId,
        transactionId,
        updateTransactionRequest,
        options,
      )
      .then((request) => request(this.axios, this.basePath));
  }
}

/**
 * PortfolioApi - axios parameter creator
 * @export
 */
export const PortfolioApiAxiosParamCreator = function (
  configuration?: Configuration,
) {
  return {
    /**
     * Returns a list of assets that user holds and their current value.
     * @summary Get Holdings
     * @param {string} userId
     * @param {number} [defaultAssetId]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getHoldings: async (
      userId: string,
      defaultAssetId?: number,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("getHoldings", "userId", userId);
      const localVarPath = `/api/users/{user_id}/portfolio/holdings`.replace(
        `{${"user_id"}}`,
        encodeURIComponent(String(userId)),
      );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      if (defaultAssetId !== undefined) {
        localVarQueryParameter["default_asset_id"] = defaultAssetId;
      }

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Returns a list of net worth of an user at specific points in time, depending on the range provided.
     * @summary Get Net Worth History
     * @param {string} userId
     * @param {string} [range]
     * @param {number} [defaultAssetId]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getNetworthHistory: async (
      userId: string,
      range?: string,
      defaultAssetId?: number,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("getNetworthHistory", "userId", userId);
      const localVarPath = `/api/users/{user_id}/portfolio/history`.replace(
        `{${"user_id"}}`,
        encodeURIComponent(String(userId)),
      );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      if (range !== undefined) {
        localVarQueryParameter["range"] = range;
      }

      if (defaultAssetId !== undefined) {
        localVarQueryParameter["default_asset_id"] = defaultAssetId;
      }

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Retunrs information about the entire portfolio and statistics such as gains/losses
     * @summary Get Portfolio Overview
     * @param {string} userId
     * @param {number} [defaultAssetId]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getPortfolioOverview: async (
      userId: string,
      defaultAssetId?: number,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("getPortfolioOverview", "userId", userId);
      const localVarPath = `/api/users/{user_id}/portfolio/overview`.replace(
        `{${"user_id"}}`,
        encodeURIComponent(String(userId)),
      );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      if (defaultAssetId !== undefined) {
        localVarQueryParameter["default_asset_id"] = defaultAssetId;
      }

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
  };
};

/**
 * PortfolioApi - functional programming interface
 * @export
 */
export const PortfolioApiFp = function (configuration?: Configuration) {
  const localVarAxiosParamCreator =
    PortfolioApiAxiosParamCreator(configuration);
  return {
    /**
     * Returns a list of assets that user holds and their current value.
     * @summary Get Holdings
     * @param {string} userId
     * @param {number} [defaultAssetId]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getHoldings(
      userId: string,
      defaultAssetId?: number,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<GetHoldingsResponse>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getHoldings(
        userId,
        defaultAssetId,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["PortfolioApi.getHoldings"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Returns a list of net worth of an user at specific points in time, depending on the range provided.
     * @summary Get Net Worth History
     * @param {string} userId
     * @param {string} [range]
     * @param {number} [defaultAssetId]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getNetworthHistory(
      userId: string,
      range?: string,
      defaultAssetId?: number,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<GetNetWorthHistoryResponse>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.getNetworthHistory(
          userId,
          range,
          defaultAssetId,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["PortfolioApi.getNetworthHistory"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Retunrs information about the entire portfolio and statistics such as gains/losses
     * @summary Get Portfolio Overview
     * @param {string} userId
     * @param {number} [defaultAssetId]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getPortfolioOverview(
      userId: string,
      defaultAssetId?: number,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<GetPortfolioOverview>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.getPortfolioOverview(
          userId,
          defaultAssetId,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["PortfolioApi.getPortfolioOverview"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
  };
};

/**
 * PortfolioApi - factory interface
 * @export
 */
export const PortfolioApiFactory = function (
  configuration?: Configuration,
  basePath?: string,
  axios?: AxiosInstance,
) {
  const localVarFp = PortfolioApiFp(configuration);
  return {
    /**
     * Returns a list of assets that user holds and their current value.
     * @summary Get Holdings
     * @param {string} userId
     * @param {number} [defaultAssetId]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getHoldings(
      userId: string,
      defaultAssetId?: number,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<GetHoldingsResponse> {
      return localVarFp
        .getHoldings(userId, defaultAssetId, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Returns a list of net worth of an user at specific points in time, depending on the range provided.
     * @summary Get Net Worth History
     * @param {string} userId
     * @param {string} [range]
     * @param {number} [defaultAssetId]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getNetworthHistory(
      userId: string,
      range?: string,
      defaultAssetId?: number,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<GetNetWorthHistoryResponse> {
      return localVarFp
        .getNetworthHistory(userId, range, defaultAssetId, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Retunrs information about the entire portfolio and statistics such as gains/losses
     * @summary Get Portfolio Overview
     * @param {string} userId
     * @param {number} [defaultAssetId]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getPortfolioOverview(
      userId: string,
      defaultAssetId?: number,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<GetPortfolioOverview> {
      return localVarFp
        .getPortfolioOverview(userId, defaultAssetId, options)
        .then((request) => request(axios, basePath));
    },
  };
};

/**
 * PortfolioApi - interface
 * @export
 * @interface PortfolioApi
 */
export interface PortfolioApiInterface {
  /**
   * Returns a list of assets that user holds and their current value.
   * @summary Get Holdings
   * @param {string} userId
   * @param {number} [defaultAssetId]
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof PortfolioApiInterface
   */
  getHoldings(
    userId: string,
    defaultAssetId?: number,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<GetHoldingsResponse>;

  /**
   * Returns a list of net worth of an user at specific points in time, depending on the range provided.
   * @summary Get Net Worth History
   * @param {string} userId
   * @param {string} [range]
   * @param {number} [defaultAssetId]
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof PortfolioApiInterface
   */
  getNetworthHistory(
    userId: string,
    range?: string,
    defaultAssetId?: number,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<GetNetWorthHistoryResponse>;

  /**
   * Retunrs information about the entire portfolio and statistics such as gains/losses
   * @summary Get Portfolio Overview
   * @param {string} userId
   * @param {number} [defaultAssetId]
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof PortfolioApiInterface
   */
  getPortfolioOverview(
    userId: string,
    defaultAssetId?: number,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<GetPortfolioOverview>;
}

/**
 * PortfolioApi - object-oriented interface
 * @export
 * @class PortfolioApi
 * @extends {BaseAPI}
 */
export class PortfolioApi extends BaseAPI implements PortfolioApiInterface {
  /**
   * Returns a list of assets that user holds and their current value.
   * @summary Get Holdings
   * @param {string} userId
   * @param {number} [defaultAssetId]
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof PortfolioApi
   */
  public getHoldings(
    userId: string,
    defaultAssetId?: number,
    options?: RawAxiosRequestConfig,
  ) {
    return PortfolioApiFp(this.configuration)
      .getHoldings(userId, defaultAssetId, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Returns a list of net worth of an user at specific points in time, depending on the range provided.
   * @summary Get Net Worth History
   * @param {string} userId
   * @param {string} [range]
   * @param {number} [defaultAssetId]
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof PortfolioApi
   */
  public getNetworthHistory(
    userId: string,
    range?: string,
    defaultAssetId?: number,
    options?: RawAxiosRequestConfig,
  ) {
    return PortfolioApiFp(this.configuration)
      .getNetworthHistory(userId, range, defaultAssetId, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Retunrs information about the entire portfolio and statistics such as gains/losses
   * @summary Get Portfolio Overview
   * @param {string} userId
   * @param {number} [defaultAssetId]
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof PortfolioApi
   */
  public getPortfolioOverview(
    userId: string,
    defaultAssetId?: number,
    options?: RawAxiosRequestConfig,
  ) {
    return PortfolioApiFp(this.configuration)
      .getPortfolioOverview(userId, defaultAssetId, options)
      .then((request) => request(this.axios, this.basePath));
  }
}

/**
 * TransactionGroupsApi - axios parameter creator
 * @export
 */
export const TransactionGroupsApiAxiosParamCreator = function (
  configuration?: Configuration,
) {
  return {
    /**
     * Adds a group of transactions with metadata related to all of them.
     * @summary Add new
     * @param {string} userId
     * @param {TransactionGroupTransactionWithEntries} transactionGroupTransactionWithEntries
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    addTransactionGroup: async (
      userId: string,
      transactionGroupTransactionWithEntries: TransactionGroupTransactionWithEntries,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("addTransactionGroup", "userId", userId);
      // verify required parameter 'transactionGroupTransactionWithEntries' is not null or undefined
      assertParamExists(
        "addTransactionGroup",
        "transactionGroupTransactionWithEntries",
        transactionGroupTransactionWithEntries,
      );
      const localVarPath = `/api/users/{user_id}/transactions/groups`.replace(
        `{${"user_id"}}`,
        encodeURIComponent(String(userId)),
      );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "POST",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      localVarHeaderParameter["Content-Type"] = "application/json";

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };
      localVarRequestOptions.data = serializeDataIfNeeded(
        transactionGroupTransactionWithEntries,
        localVarRequestOptions,
        configuration,
      );

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Deletes the entire transaction group and associated transactions within it.
     * @summary Delete existing
     * @param {string} groupId
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    deleteAnExistingTransactionGroup: async (
      groupId: string,
      userId: string,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'groupId' is not null or undefined
      assertParamExists("deleteAnExistingTransactionGroup", "groupId", groupId);
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("deleteAnExistingTransactionGroup", "userId", userId);
      const localVarPath = `/api/users/{user_id}/transactions/groups/{group_id}`
        .replace(`{${"group_id"}}`, encodeURIComponent(String(groupId)))
        .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)));
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "DELETE",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Retrieves a paginated list of transaction groups
     * @summary Get all
     * @param {string} userId
     * @param {number} [limit]
     * @param {string} [cursor]
     * @param {number} [start]
     * @param {number} [count]
     * @param {string} [query]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getTransactionGroups: async (
      userId: string,
      limit?: number,
      cursor?: string,
      start?: number,
      count?: number,
      query?: string,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("getTransactionGroups", "userId", userId);
      const localVarPath = `/api/users/{user_id}/transactions/groups`.replace(
        `{${"user_id"}}`,
        encodeURIComponent(String(userId)),
      );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      if (limit !== undefined) {
        localVarQueryParameter["limit"] = limit;
      }

      if (cursor !== undefined) {
        localVarQueryParameter["cursor"] = cursor;
      }

      if (start !== undefined) {
        localVarQueryParameter["start"] = start;
      }

      if (count !== undefined) {
        localVarQueryParameter["count"] = count;
      }

      if (query !== undefined) {
        localVarQueryParameter["query"] = query;
      }

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Creates a new transaction group from existing individual transactions. The provided transaction IDs will be moved from individual to the new group.
     * @summary Group individual transactions
     * @param {string} userId
     * @param {TransactionGroupIdentifiableTransactionWithIdentifiableEntries} transactionGroupIdentifiableTransactionWithIdentifiableEntries
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    groupIndividualTransactions: async (
      userId: string,
      transactionGroupIdentifiableTransactionWithIdentifiableEntries: TransactionGroupIdentifiableTransactionWithIdentifiableEntries,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("groupIndividualTransactions", "userId", userId);
      // verify required parameter 'transactionGroupIdentifiableTransactionWithIdentifiableEntries' is not null or undefined
      assertParamExists(
        "groupIndividualTransactions",
        "transactionGroupIdentifiableTransactionWithIdentifiableEntries",
        transactionGroupIdentifiableTransactionWithIdentifiableEntries,
      );
      const localVarPath = `/api/users/{user_id}/transactions/groups`.replace(
        `{${"user_id"}}`,
        encodeURIComponent(String(userId)),
      );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "PUT",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      localVarHeaderParameter["Content-Type"] = "application/json";

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };
      localVarRequestOptions.data = serializeDataIfNeeded(
        transactionGroupIdentifiableTransactionWithIdentifiableEntries,
        localVarRequestOptions,
        configuration,
      );

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * If the transactions array is updated with an existing transaction id, that transaction will be moved from individual to a group.
     * @summary Update existing
     * @param {string} groupId
     * @param {string} userId
     * @param {TransactionGroupIdentifiableTransactionWithIdentifiableEntries} transactionGroupIdentifiableTransactionWithIdentifiableEntries
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    updateTransactionGroup: async (
      groupId: string,
      userId: string,
      transactionGroupIdentifiableTransactionWithIdentifiableEntries: TransactionGroupIdentifiableTransactionWithIdentifiableEntries,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'groupId' is not null or undefined
      assertParamExists("updateTransactionGroup", "groupId", groupId);
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("updateTransactionGroup", "userId", userId);
      // verify required parameter 'transactionGroupIdentifiableTransactionWithIdentifiableEntries' is not null or undefined
      assertParamExists(
        "updateTransactionGroup",
        "transactionGroupIdentifiableTransactionWithIdentifiableEntries",
        transactionGroupIdentifiableTransactionWithIdentifiableEntries,
      );
      const localVarPath = `/api/users/{user_id}/transactions/groups/{group_id}`
        .replace(`{${"group_id"}}`, encodeURIComponent(String(groupId)))
        .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)));
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "PUT",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      localVarHeaderParameter["Content-Type"] = "application/json";

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };
      localVarRequestOptions.data = serializeDataIfNeeded(
        transactionGroupIdentifiableTransactionWithIdentifiableEntries,
        localVarRequestOptions,
        configuration,
      );

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
  };
};

/**
 * TransactionGroupsApi - functional programming interface
 * @export
 */
export const TransactionGroupsApiFp = function (configuration?: Configuration) {
  const localVarAxiosParamCreator =
    TransactionGroupsApiAxiosParamCreator(configuration);
  return {
    /**
     * Adds a group of transactions with metadata related to all of them.
     * @summary Add new
     * @param {string} userId
     * @param {TransactionGroupTransactionWithEntries} transactionGroupTransactionWithEntries
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async addTransactionGroup(
      userId: string,
      transactionGroupTransactionWithEntries: TransactionGroupTransactionWithEntries,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<AddTransactionGroupResponse>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.addTransactionGroup(
          userId,
          transactionGroupTransactionWithEntries,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["TransactionGroupsApi.addTransactionGroup"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Deletes the entire transaction group and associated transactions within it.
     * @summary Delete existing
     * @param {string} groupId
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async deleteAnExistingTransactionGroup(
      groupId: string,
      userId: string,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (axios?: AxiosInstance, basePath?: string) => AxiosPromise<void>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.deleteAnExistingTransactionGroup(
          groupId,
          userId,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap[
          "TransactionGroupsApi.deleteAnExistingTransactionGroup"
        ]?.[localVarOperationServerIndex]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Retrieves a paginated list of transaction groups
     * @summary Get all
     * @param {string} userId
     * @param {number} [limit]
     * @param {string} [cursor]
     * @param {number} [start]
     * @param {number} [count]
     * @param {string} [query]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getTransactionGroups(
      userId: string,
      limit?: number,
      cursor?: string,
      start?: number,
      count?: number,
      query?: string,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<TransactionGroupsPage>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.getTransactionGroups(
          userId,
          limit,
          cursor,
          start,
          count,
          query,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["TransactionGroupsApi.getTransactionGroups"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Creates a new transaction group from existing individual transactions. The provided transaction IDs will be moved from individual to the new group.
     * @summary Group individual transactions
     * @param {string} userId
     * @param {TransactionGroupIdentifiableTransactionWithIdentifiableEntries} transactionGroupIdentifiableTransactionWithIdentifiableEntries
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async groupIndividualTransactions(
      userId: string,
      transactionGroupIdentifiableTransactionWithIdentifiableEntries: TransactionGroupIdentifiableTransactionWithIdentifiableEntries,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<AddTransactionGroupResponse>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.groupIndividualTransactions(
          userId,
          transactionGroupIdentifiableTransactionWithIdentifiableEntries,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap[
          "TransactionGroupsApi.groupIndividualTransactions"
        ]?.[localVarOperationServerIndex]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * If the transactions array is updated with an existing transaction id, that transaction will be moved from individual to a group.
     * @summary Update existing
     * @param {string} groupId
     * @param {string} userId
     * @param {TransactionGroupIdentifiableTransactionWithIdentifiableEntries} transactionGroupIdentifiableTransactionWithIdentifiableEntries
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async updateTransactionGroup(
      groupId: string,
      userId: string,
      transactionGroupIdentifiableTransactionWithIdentifiableEntries: TransactionGroupIdentifiableTransactionWithIdentifiableEntries,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<UpdateTransactionGroupResponse>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.updateTransactionGroup(
          groupId,
          userId,
          transactionGroupIdentifiableTransactionWithIdentifiableEntries,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["TransactionGroupsApi.updateTransactionGroup"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
  };
};

/**
 * TransactionGroupsApi - factory interface
 * @export
 */
export const TransactionGroupsApiFactory = function (
  configuration?: Configuration,
  basePath?: string,
  axios?: AxiosInstance,
) {
  const localVarFp = TransactionGroupsApiFp(configuration);
  return {
    /**
     * Adds a group of transactions with metadata related to all of them.
     * @summary Add new
     * @param {string} userId
     * @param {TransactionGroupTransactionWithEntries} transactionGroupTransactionWithEntries
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    addTransactionGroup(
      userId: string,
      transactionGroupTransactionWithEntries: TransactionGroupTransactionWithEntries,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<AddTransactionGroupResponse> {
      return localVarFp
        .addTransactionGroup(
          userId,
          transactionGroupTransactionWithEntries,
          options,
        )
        .then((request) => request(axios, basePath));
    },
    /**
     * Deletes the entire transaction group and associated transactions within it.
     * @summary Delete existing
     * @param {string} groupId
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    deleteAnExistingTransactionGroup(
      groupId: string,
      userId: string,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<void> {
      return localVarFp
        .deleteAnExistingTransactionGroup(groupId, userId, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Retrieves a paginated list of transaction groups
     * @summary Get all
     * @param {string} userId
     * @param {number} [limit]
     * @param {string} [cursor]
     * @param {number} [start]
     * @param {number} [count]
     * @param {string} [query]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getTransactionGroups(
      userId: string,
      limit?: number,
      cursor?: string,
      start?: number,
      count?: number,
      query?: string,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<TransactionGroupsPage> {
      return localVarFp
        .getTransactionGroups(
          userId,
          limit,
          cursor,
          start,
          count,
          query,
          options,
        )
        .then((request) => request(axios, basePath));
    },
    /**
     * Creates a new transaction group from existing individual transactions. The provided transaction IDs will be moved from individual to the new group.
     * @summary Group individual transactions
     * @param {string} userId
     * @param {TransactionGroupIdentifiableTransactionWithIdentifiableEntries} transactionGroupIdentifiableTransactionWithIdentifiableEntries
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    groupIndividualTransactions(
      userId: string,
      transactionGroupIdentifiableTransactionWithIdentifiableEntries: TransactionGroupIdentifiableTransactionWithIdentifiableEntries,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<AddTransactionGroupResponse> {
      return localVarFp
        .groupIndividualTransactions(
          userId,
          transactionGroupIdentifiableTransactionWithIdentifiableEntries,
          options,
        )
        .then((request) => request(axios, basePath));
    },
    /**
     * If the transactions array is updated with an existing transaction id, that transaction will be moved from individual to a group.
     * @summary Update existing
     * @param {string} groupId
     * @param {string} userId
     * @param {TransactionGroupIdentifiableTransactionWithIdentifiableEntries} transactionGroupIdentifiableTransactionWithIdentifiableEntries
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    updateTransactionGroup(
      groupId: string,
      userId: string,
      transactionGroupIdentifiableTransactionWithIdentifiableEntries: TransactionGroupIdentifiableTransactionWithIdentifiableEntries,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<UpdateTransactionGroupResponse> {
      return localVarFp
        .updateTransactionGroup(
          groupId,
          userId,
          transactionGroupIdentifiableTransactionWithIdentifiableEntries,
          options,
        )
        .then((request) => request(axios, basePath));
    },
  };
};

/**
 * TransactionGroupsApi - interface
 * @export
 * @interface TransactionGroupsApi
 */
export interface TransactionGroupsApiInterface {
  /**
   * Adds a group of transactions with metadata related to all of them.
   * @summary Add new
   * @param {string} userId
   * @param {TransactionGroupTransactionWithEntries} transactionGroupTransactionWithEntries
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof TransactionGroupsApiInterface
   */
  addTransactionGroup(
    userId: string,
    transactionGroupTransactionWithEntries: TransactionGroupTransactionWithEntries,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<AddTransactionGroupResponse>;

  /**
   * Deletes the entire transaction group and associated transactions within it.
   * @summary Delete existing
   * @param {string} groupId
   * @param {string} userId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof TransactionGroupsApiInterface
   */
  deleteAnExistingTransactionGroup(
    groupId: string,
    userId: string,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<void>;

  /**
   * Retrieves a paginated list of transaction groups
   * @summary Get all
   * @param {string} userId
   * @param {number} [limit]
   * @param {string} [cursor]
   * @param {number} [start]
   * @param {number} [count]
   * @param {string} [query]
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof TransactionGroupsApiInterface
   */
  getTransactionGroups(
    userId: string,
    limit?: number,
    cursor?: string,
    start?: number,
    count?: number,
    query?: string,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<TransactionGroupsPage>;

  /**
   * Creates a new transaction group from existing individual transactions. The provided transaction IDs will be moved from individual to the new group.
   * @summary Group individual transactions
   * @param {string} userId
   * @param {TransactionGroupIdentifiableTransactionWithIdentifiableEntries} transactionGroupIdentifiableTransactionWithIdentifiableEntries
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof TransactionGroupsApiInterface
   */
  groupIndividualTransactions(
    userId: string,
    transactionGroupIdentifiableTransactionWithIdentifiableEntries: TransactionGroupIdentifiableTransactionWithIdentifiableEntries,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<AddTransactionGroupResponse>;

  /**
   * If the transactions array is updated with an existing transaction id, that transaction will be moved from individual to a group.
   * @summary Update existing
   * @param {string} groupId
   * @param {string} userId
   * @param {TransactionGroupIdentifiableTransactionWithIdentifiableEntries} transactionGroupIdentifiableTransactionWithIdentifiableEntries
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof TransactionGroupsApiInterface
   */
  updateTransactionGroup(
    groupId: string,
    userId: string,
    transactionGroupIdentifiableTransactionWithIdentifiableEntries: TransactionGroupIdentifiableTransactionWithIdentifiableEntries,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<UpdateTransactionGroupResponse>;
}

/**
 * TransactionGroupsApi - object-oriented interface
 * @export
 * @class TransactionGroupsApi
 * @extends {BaseAPI}
 */
export class TransactionGroupsApi
  extends BaseAPI
  implements TransactionGroupsApiInterface
{
  /**
   * Adds a group of transactions with metadata related to all of them.
   * @summary Add new
   * @param {string} userId
   * @param {TransactionGroupTransactionWithEntries} transactionGroupTransactionWithEntries
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof TransactionGroupsApi
   */
  public addTransactionGroup(
    userId: string,
    transactionGroupTransactionWithEntries: TransactionGroupTransactionWithEntries,
    options?: RawAxiosRequestConfig,
  ) {
    return TransactionGroupsApiFp(this.configuration)
      .addTransactionGroup(
        userId,
        transactionGroupTransactionWithEntries,
        options,
      )
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Deletes the entire transaction group and associated transactions within it.
   * @summary Delete existing
   * @param {string} groupId
   * @param {string} userId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof TransactionGroupsApi
   */
  public deleteAnExistingTransactionGroup(
    groupId: string,
    userId: string,
    options?: RawAxiosRequestConfig,
  ) {
    return TransactionGroupsApiFp(this.configuration)
      .deleteAnExistingTransactionGroup(groupId, userId, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Retrieves a paginated list of transaction groups
   * @summary Get all
   * @param {string} userId
   * @param {number} [limit]
   * @param {string} [cursor]
   * @param {number} [start]
   * @param {number} [count]
   * @param {string} [query]
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof TransactionGroupsApi
   */
  public getTransactionGroups(
    userId: string,
    limit?: number,
    cursor?: string,
    start?: number,
    count?: number,
    query?: string,
    options?: RawAxiosRequestConfig,
  ) {
    return TransactionGroupsApiFp(this.configuration)
      .getTransactionGroups(userId, limit, cursor, start, count, query, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Creates a new transaction group from existing individual transactions. The provided transaction IDs will be moved from individual to the new group.
   * @summary Group individual transactions
   * @param {string} userId
   * @param {TransactionGroupIdentifiableTransactionWithIdentifiableEntries} transactionGroupIdentifiableTransactionWithIdentifiableEntries
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof TransactionGroupsApi
   */
  public groupIndividualTransactions(
    userId: string,
    transactionGroupIdentifiableTransactionWithIdentifiableEntries: TransactionGroupIdentifiableTransactionWithIdentifiableEntries,
    options?: RawAxiosRequestConfig,
  ) {
    return TransactionGroupsApiFp(this.configuration)
      .groupIndividualTransactions(
        userId,
        transactionGroupIdentifiableTransactionWithIdentifiableEntries,
        options,
      )
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * If the transactions array is updated with an existing transaction id, that transaction will be moved from individual to a group.
   * @summary Update existing
   * @param {string} groupId
   * @param {string} userId
   * @param {TransactionGroupIdentifiableTransactionWithIdentifiableEntries} transactionGroupIdentifiableTransactionWithIdentifiableEntries
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof TransactionGroupsApi
   */
  public updateTransactionGroup(
    groupId: string,
    userId: string,
    transactionGroupIdentifiableTransactionWithIdentifiableEntries: TransactionGroupIdentifiableTransactionWithIdentifiableEntries,
    options?: RawAxiosRequestConfig,
  ) {
    return TransactionGroupsApiFp(this.configuration)
      .updateTransactionGroup(
        groupId,
        userId,
        transactionGroupIdentifiableTransactionWithIdentifiableEntries,
        options,
      )
      .then((request) => request(this.axios, this.basePath));
  }
}

/**
 * TransactionsApi - axios parameter creator
 * @export
 */
export const TransactionsApiAxiosParamCreator = function (
  configuration?: Configuration,
) {
  return {
    /**
     * Deleted any transaction, whether its individual or from a group.
     * @summary Delete existing
     * @param {string} transactionId
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    deleteAnExistingTransaction: async (
      transactionId: string,
      userId: string,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'transactionId' is not null or undefined
      assertParamExists(
        "deleteAnExistingTransaction",
        "transactionId",
        transactionId,
      );
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("deleteAnExistingTransaction", "userId", userId);
      const localVarPath = `/api/users/{user_id}/transactions/{transaction_id}`
        .replace(
          `{${"transaction_id"}}`,
          encodeURIComponent(String(transactionId)),
        )
        .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)));
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "DELETE",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Retrieves a list of all individual and grouped transactions
     * @summary Get all
     * @param {string} userId
     * @param {number} [limit]
     * @param {string} [cursor]
     * @param {number} [start]
     * @param {number} [count]
     * @param {string} [query]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getTransactions: async (
      userId: string,
      limit?: number,
      cursor?: string,
      start?: number,
      count?: number,
      query?: string,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("getTransactions", "userId", userId);
      const localVarPath = `/api/users/{user_id}/transactions`.replace(
        `{${"user_id"}}`,
        encodeURIComponent(String(userId)),
      );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      if (limit !== undefined) {
        localVarQueryParameter["limit"] = limit;
      }

      if (cursor !== undefined) {
        localVarQueryParameter["cursor"] = cursor;
      }

      if (start !== undefined) {
        localVarQueryParameter["start"] = start;
      }

      if (count !== undefined) {
        localVarQueryParameter["count"] = count;
      }

      if (query !== undefined) {
        localVarQueryParameter["query"] = query;
      }

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * This is a generic update endpoint which does not assume whether transaction is individual or group. It only updates the contents of the transaction without moving it.
     * @summary Update existing
     * @param {string} transactionId
     * @param {string} userId
     * @param {UpdateTransactionRequest} updateTransactionRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    updateAnExistingTransaction: async (
      transactionId: string,
      userId: string,
      updateTransactionRequest: UpdateTransactionRequest,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'transactionId' is not null or undefined
      assertParamExists(
        "updateAnExistingTransaction",
        "transactionId",
        transactionId,
      );
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("updateAnExistingTransaction", "userId", userId);
      // verify required parameter 'updateTransactionRequest' is not null or undefined
      assertParamExists(
        "updateAnExistingTransaction",
        "updateTransactionRequest",
        updateTransactionRequest,
      );
      const localVarPath = `/api/users/{user_id}/transactions/{transaction_id}`
        .replace(
          `{${"transaction_id"}}`,
          encodeURIComponent(String(transactionId)),
        )
        .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)));
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "PUT",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      localVarHeaderParameter["Content-Type"] = "application/json";

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };
      localVarRequestOptions.data = serializeDataIfNeeded(
        updateTransactionRequest,
        localVarRequestOptions,
        configuration,
      );

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
  };
};

/**
 * TransactionsApi - functional programming interface
 * @export
 */
export const TransactionsApiFp = function (configuration?: Configuration) {
  const localVarAxiosParamCreator =
    TransactionsApiAxiosParamCreator(configuration);
  return {
    /**
     * Deleted any transaction, whether its individual or from a group.
     * @summary Delete existing
     * @param {string} transactionId
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async deleteAnExistingTransaction(
      transactionId: string,
      userId: string,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (axios?: AxiosInstance, basePath?: string) => AxiosPromise<void>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.deleteAnExistingTransaction(
          transactionId,
          userId,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["TransactionsApi.deleteAnExistingTransaction"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Retrieves a list of all individual and grouped transactions
     * @summary Get all
     * @param {string} userId
     * @param {number} [limit]
     * @param {string} [cursor]
     * @param {number} [start]
     * @param {number} [count]
     * @param {string} [query]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getTransactions(
      userId: string,
      limit?: number,
      cursor?: string,
      start?: number,
      count?: number,
      query?: string,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<CombinedTransactionsPage>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getTransactions(
        userId,
        limit,
        cursor,
        start,
        count,
        query,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["TransactionsApi.getTransactions"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * This is a generic update endpoint which does not assume whether transaction is individual or group. It only updates the contents of the transaction without moving it.
     * @summary Update existing
     * @param {string} transactionId
     * @param {string} userId
     * @param {UpdateTransactionRequest} updateTransactionRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async updateAnExistingTransaction(
      transactionId: string,
      userId: string,
      updateTransactionRequest: UpdateTransactionRequest,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<UpdateTransactionResponse>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.updateAnExistingTransaction(
          transactionId,
          userId,
          updateTransactionRequest,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["TransactionsApi.updateAnExistingTransaction"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
  };
};

/**
 * TransactionsApi - factory interface
 * @export
 */
export const TransactionsApiFactory = function (
  configuration?: Configuration,
  basePath?: string,
  axios?: AxiosInstance,
) {
  const localVarFp = TransactionsApiFp(configuration);
  return {
    /**
     * Deleted any transaction, whether its individual or from a group.
     * @summary Delete existing
     * @param {string} transactionId
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    deleteAnExistingTransaction(
      transactionId: string,
      userId: string,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<void> {
      return localVarFp
        .deleteAnExistingTransaction(transactionId, userId, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Retrieves a list of all individual and grouped transactions
     * @summary Get all
     * @param {string} userId
     * @param {number} [limit]
     * @param {string} [cursor]
     * @param {number} [start]
     * @param {number} [count]
     * @param {string} [query]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getTransactions(
      userId: string,
      limit?: number,
      cursor?: string,
      start?: number,
      count?: number,
      query?: string,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<CombinedTransactionsPage> {
      return localVarFp
        .getTransactions(userId, limit, cursor, start, count, query, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * This is a generic update endpoint which does not assume whether transaction is individual or group. It only updates the contents of the transaction without moving it.
     * @summary Update existing
     * @param {string} transactionId
     * @param {string} userId
     * @param {UpdateTransactionRequest} updateTransactionRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    updateAnExistingTransaction(
      transactionId: string,
      userId: string,
      updateTransactionRequest: UpdateTransactionRequest,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<UpdateTransactionResponse> {
      return localVarFp
        .updateAnExistingTransaction(
          transactionId,
          userId,
          updateTransactionRequest,
          options,
        )
        .then((request) => request(axios, basePath));
    },
  };
};

/**
 * TransactionsApi - interface
 * @export
 * @interface TransactionsApi
 */
export interface TransactionsApiInterface {
  /**
   * Deleted any transaction, whether its individual or from a group.
   * @summary Delete existing
   * @param {string} transactionId
   * @param {string} userId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof TransactionsApiInterface
   */
  deleteAnExistingTransaction(
    transactionId: string,
    userId: string,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<void>;

  /**
   * Retrieves a list of all individual and grouped transactions
   * @summary Get all
   * @param {string} userId
   * @param {number} [limit]
   * @param {string} [cursor]
   * @param {number} [start]
   * @param {number} [count]
   * @param {string} [query]
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof TransactionsApiInterface
   */
  getTransactions(
    userId: string,
    limit?: number,
    cursor?: string,
    start?: number,
    count?: number,
    query?: string,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<CombinedTransactionsPage>;

  /**
   * This is a generic update endpoint which does not assume whether transaction is individual or group. It only updates the contents of the transaction without moving it.
   * @summary Update existing
   * @param {string} transactionId
   * @param {string} userId
   * @param {UpdateTransactionRequest} updateTransactionRequest
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof TransactionsApiInterface
   */
  updateAnExistingTransaction(
    transactionId: string,
    userId: string,
    updateTransactionRequest: UpdateTransactionRequest,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<UpdateTransactionResponse>;
}

/**
 * TransactionsApi - object-oriented interface
 * @export
 * @class TransactionsApi
 * @extends {BaseAPI}
 */
export class TransactionsApi
  extends BaseAPI
  implements TransactionsApiInterface
{
  /**
   * Deleted any transaction, whether its individual or from a group.
   * @summary Delete existing
   * @param {string} transactionId
   * @param {string} userId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof TransactionsApi
   */
  public deleteAnExistingTransaction(
    transactionId: string,
    userId: string,
    options?: RawAxiosRequestConfig,
  ) {
    return TransactionsApiFp(this.configuration)
      .deleteAnExistingTransaction(transactionId, userId, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Retrieves a list of all individual and grouped transactions
   * @summary Get all
   * @param {string} userId
   * @param {number} [limit]
   * @param {string} [cursor]
   * @param {number} [start]
   * @param {number} [count]
   * @param {string} [query]
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof TransactionsApi
   */
  public getTransactions(
    userId: string,
    limit?: number,
    cursor?: string,
    start?: number,
    count?: number,
    query?: string,
    options?: RawAxiosRequestConfig,
  ) {
    return TransactionsApiFp(this.configuration)
      .getTransactions(userId, limit, cursor, start, count, query, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * This is a generic update endpoint which does not assume whether transaction is individual or group. It only updates the contents of the transaction without moving it.
   * @summary Update existing
   * @param {string} transactionId
   * @param {string} userId
   * @param {UpdateTransactionRequest} updateTransactionRequest
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof TransactionsApi
   */
  public updateAnExistingTransaction(
    transactionId: string,
    userId: string,
    updateTransactionRequest: UpdateTransactionRequest,
    options?: RawAxiosRequestConfig,
  ) {
    return TransactionsApiFp(this.configuration)
      .updateAnExistingTransaction(
        transactionId,
        userId,
        updateTransactionRequest,
        options,
      )
      .then((request) => request(this.axios, this.basePath));
  }
}

/**
 * UserAssetsApi - axios parameter creator
 * @export
 */
export const UserAssetsApiAxiosParamCreator = function (
  configuration?: Configuration,
) {
  return {
    /**
     * Deletes manually added user asset along with all the related information about it. Return an error if the asset is in use or other assets are dependent on it as base.
     * @summary Delete user asset
     * @param {string} userId
     * @param {number} assetId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    deleteAsset: async (
      userId: string,
      assetId: number,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("deleteAsset", "userId", userId);
      // verify required parameter 'assetId' is not null or undefined
      assertParamExists("deleteAsset", "assetId", assetId);
      const localVarPath = `/api/users/{user_id}/assets/{asset_id}`
        .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)))
        .replace(`{${"asset_id"}}`, encodeURIComponent(String(assetId)));
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "DELETE",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Deletes user asset pair and its associated metadata.
     * @summary Delete user asset pair
     * @param {string} userId
     * @param {number} assetId
     * @param {number} referenceId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    deleteAssetPair: async (
      userId: string,
      assetId: number,
      referenceId: number,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("deleteAssetPair", "userId", userId);
      // verify required parameter 'assetId' is not null or undefined
      assertParamExists("deleteAssetPair", "assetId", assetId);
      // verify required parameter 'referenceId' is not null or undefined
      assertParamExists("deleteAssetPair", "referenceId", referenceId);
      const localVarPath =
        `/api/users/{user_id}/assets/{asset_id}/{reference_id}`
          .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)))
          .replace(`{${"asset_id"}}`, encodeURIComponent(String(assetId)))
          .replace(
            `{${"reference_id"}}`,
            encodeURIComponent(String(referenceId)),
          );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "DELETE",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Request with no parameters deletes all rates related to a user asset and its pair. If the parameters are specified, it deletes only the subset of it.
     * @summary Delete user asset pair rates
     * @param {string} userId
     * @param {number} assetId
     * @param {number} referenceId
     * @param {number} startTimestamp From which timestamp delete the rates inclusive.
     * @param {number} endTimestamp Until which timestamp delete the rates inclusive.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    deleteAssetPairRates: async (
      userId: string,
      assetId: number,
      referenceId: number,
      startTimestamp: number,
      endTimestamp: number,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("deleteAssetPairRates", "userId", userId);
      // verify required parameter 'assetId' is not null or undefined
      assertParamExists("deleteAssetPairRates", "assetId", assetId);
      // verify required parameter 'referenceId' is not null or undefined
      assertParamExists("deleteAssetPairRates", "referenceId", referenceId);
      // verify required parameter 'startTimestamp' is not null or undefined
      assertParamExists(
        "deleteAssetPairRates",
        "startTimestamp",
        startTimestamp,
      );
      // verify required parameter 'endTimestamp' is not null or undefined
      assertParamExists("deleteAssetPairRates", "endTimestamp", endTimestamp);
      const localVarPath =
        `/api/users/{user_id}/assets/{asset_id}/{reference_id}/rates`
          .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)))
          .replace(`{${"asset_id"}}`, encodeURIComponent(String(assetId)))
          .replace(
            `{${"reference_id"}}`,
            encodeURIComponent(String(referenceId)),
          );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "DELETE",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      if (startTimestamp !== undefined) {
        localVarQueryParameter["start_timestamp"] = startTimestamp;
      }

      if (endTimestamp !== undefined) {
        localVarQueryParameter["end_timestamp"] = endTimestamp;
      }

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Gets an custom asset added by user
     * @summary Get user asset
     * @param {string} userId
     * @param {number} assetId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getUserAsset: async (
      userId: string,
      assetId: number,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("getUserAsset", "userId", userId);
      // verify required parameter 'assetId' is not null or undefined
      assertParamExists("getUserAsset", "assetId", assetId);
      const localVarPath = `/api/users/{user_id}/assets/{asset_id}`
        .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)))
        .replace(`{${"asset_id"}}`, encodeURIComponent(String(assetId)));
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Gets metadata about user asset pair
     * @summary Get user asset pair
     * @param {string} userId
     * @param {number} assetId
     * @param {number} referenceId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getUserAssetPair: async (
      userId: string,
      assetId: number,
      referenceId: number,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("getUserAssetPair", "userId", userId);
      // verify required parameter 'assetId' is not null or undefined
      assertParamExists("getUserAssetPair", "assetId", assetId);
      // verify required parameter 'referenceId' is not null or undefined
      assertParamExists("getUserAssetPair", "referenceId", referenceId);
      const localVarPath =
        `/api/users/{user_id}/assets/{asset_id}/{reference_id}`
          .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)))
          .replace(`{${"asset_id"}}`, encodeURIComponent(String(assetId)))
          .replace(
            `{${"reference_id"}}`,
            encodeURIComponent(String(referenceId)),
          );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Gets user asset pair rates based on provided query params
     * @summary Get user asset pair rates
     * @param {string} userId
     * @param {number} assetId
     * @param {number} referenceId
     * @param {string} [range]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getUserAssetPairRates: async (
      userId: string,
      assetId: number,
      referenceId: number,
      range?: string,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("getUserAssetPairRates", "userId", userId);
      // verify required parameter 'assetId' is not null or undefined
      assertParamExists("getUserAssetPairRates", "assetId", assetId);
      // verify required parameter 'referenceId' is not null or undefined
      assertParamExists("getUserAssetPairRates", "referenceId", referenceId);
      const localVarPath =
        `/api/users/{user_id}/assets/{asset_id}/{reference_id}/rates`
          .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)))
          .replace(`{${"asset_id"}}`, encodeURIComponent(String(assetId)))
          .replace(
            `{${"reference_id"}}`,
            encodeURIComponent(String(referenceId)),
          );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      if (range !== undefined) {
        localVarQueryParameter["range"] = range;
      }

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Gets all custom assets created by the user. Returns unpaginated results with lookup tables.
     * @summary List user assets
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getUserAssets: async (
      userId: string,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("getUserAssets", "userId", userId);
      const localVarPath = `/api/users/{user_id}/assets`.replace(
        `{${"user_id"}}`,
        encodeURIComponent(String(userId)),
      );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Adds a new reference pair to an existing user asset.
     * @summary Add user asset pair
     * @param {string} userId
     * @param {number} assetId
     * @param {AddAssetPairRequest} addAssetPairRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    postAssetPair: async (
      userId: string,
      assetId: number,
      addAssetPairRequest: AddAssetPairRequest,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("postAssetPair", "userId", userId);
      // verify required parameter 'assetId' is not null or undefined
      assertParamExists("postAssetPair", "assetId", assetId);
      // verify required parameter 'addAssetPairRequest' is not null or undefined
      assertParamExists(
        "postAssetPair",
        "addAssetPairRequest",
        addAssetPairRequest,
      );
      const localVarPath = `/api/users/{user_id}/assets/{asset_id}/pairs`
        .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)))
        .replace(`{${"asset_id"}}`, encodeURIComponent(String(assetId)));
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "POST",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      localVarHeaderParameter["Content-Type"] = "application/json";

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };
      localVarRequestOptions.data = serializeDataIfNeeded(
        addAssetPairRequest,
        localVarRequestOptions,
        configuration,
      );

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Adds a user defined asset.
     * @summary Add user asset
     * @param {string} userId
     * @param {AddAssetRequest} addAssetRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    postCustomAsset: async (
      userId: string,
      addAssetRequest: AddAssetRequest,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("postCustomAsset", "userId", userId);
      // verify required parameter 'addAssetRequest' is not null or undefined
      assertParamExists("postCustomAsset", "addAssetRequest", addAssetRequest);
      const localVarPath = `/api/users/{user_id}/assets`.replace(
        `{${"user_id"}}`,
        encodeURIComponent(String(userId)),
      );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "POST",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      localVarHeaderParameter["Content-Type"] = "application/json";

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };
      localVarRequestOptions.data = serializeDataIfNeeded(
        addAssetRequest,
        localVarRequestOptions,
        configuration,
      );

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Adds a list of user asset pair rates. The list may contain one or many elements. If the rate already exists, error will be returned.
     * @summary Add user asset pair rates
     * @param {string} userId
     * @param {number} assetId
     * @param {number} referenceId
     * @param {AddAssetPairRatesRequest} addAssetPairRatesRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    postCustomAssetRates: async (
      userId: string,
      assetId: number,
      referenceId: number,
      addAssetPairRatesRequest: AddAssetPairRatesRequest,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("postCustomAssetRates", "userId", userId);
      // verify required parameter 'assetId' is not null or undefined
      assertParamExists("postCustomAssetRates", "assetId", assetId);
      // verify required parameter 'referenceId' is not null or undefined
      assertParamExists("postCustomAssetRates", "referenceId", referenceId);
      // verify required parameter 'addAssetPairRatesRequest' is not null or undefined
      assertParamExists(
        "postCustomAssetRates",
        "addAssetPairRatesRequest",
        addAssetPairRatesRequest,
      );
      const localVarPath =
        `/api/users/{user_id}/assets/{asset_id}/{reference_id}/rates`
          .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)))
          .replace(`{${"asset_id"}}`, encodeURIComponent(String(assetId)))
          .replace(
            `{${"reference_id"}}`,
            encodeURIComponent(String(referenceId)),
          );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "POST",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      localVarHeaderParameter["Content-Type"] = "application/json";

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };
      localVarRequestOptions.data = serializeDataIfNeeded(
        addAssetPairRatesRequest,
        localVarRequestOptions,
        configuration,
      );

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Update already existing user defined asset.
     * @summary Update user asset
     * @param {string} userId
     * @param {number} assetId
     * @param {AddAssetRequest} addAssetRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    putCustomAsset: async (
      userId: string,
      assetId: number,
      addAssetRequest: AddAssetRequest,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("putCustomAsset", "userId", userId);
      // verify required parameter 'assetId' is not null or undefined
      assertParamExists("putCustomAsset", "assetId", assetId);
      // verify required parameter 'addAssetRequest' is not null or undefined
      assertParamExists("putCustomAsset", "addAssetRequest", addAssetRequest);
      const localVarPath = `/api/users/{user_id}/assets/{asset_id}`
        .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)))
        .replace(`{${"asset_id"}}`, encodeURIComponent(String(assetId)));
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "PUT",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      localVarHeaderParameter["Content-Type"] = "application/json";

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };
      localVarRequestOptions.data = serializeDataIfNeeded(
        addAssetRequest,
        localVarRequestOptions,
        configuration,
      );

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Change the metadata related to user asset pair. As user asset pair is not uniquely identifiable we do not need a POST to create it. It is created by default as you add rates, and this endpoint serves as a way to add or update metadata.
     * @summary Update user asset pair metadata
     * @param {string} userId
     * @param {number} assetId
     * @param {number} referenceId
     * @param {UserAssetPairMetadata} userAssetPairMetadata
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    putCustomAssetPair: async (
      userId: string,
      assetId: number,
      referenceId: number,
      userAssetPairMetadata: UserAssetPairMetadata,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("putCustomAssetPair", "userId", userId);
      // verify required parameter 'assetId' is not null or undefined
      assertParamExists("putCustomAssetPair", "assetId", assetId);
      // verify required parameter 'referenceId' is not null or undefined
      assertParamExists("putCustomAssetPair", "referenceId", referenceId);
      // verify required parameter 'userAssetPairMetadata' is not null or undefined
      assertParamExists(
        "putCustomAssetPair",
        "userAssetPairMetadata",
        userAssetPairMetadata,
      );
      const localVarPath =
        `/api/users/{user_id}/assets/{asset_id}/{reference_id}/usermetadata`
          .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)))
          .replace(`{${"asset_id"}}`, encodeURIComponent(String(assetId)))
          .replace(
            `{${"reference_id"}}`,
            encodeURIComponent(String(referenceId)),
          );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "PUT",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      localVarHeaderParameter["Content-Type"] = "application/json";

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };
      localVarRequestOptions.data = serializeDataIfNeeded(
        userAssetPairMetadata,
        localVarRequestOptions,
        configuration,
      );

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
  };
};

/**
 * UserAssetsApi - functional programming interface
 * @export
 */
export const UserAssetsApiFp = function (configuration?: Configuration) {
  const localVarAxiosParamCreator =
    UserAssetsApiAxiosParamCreator(configuration);
  return {
    /**
     * Deletes manually added user asset along with all the related information about it. Return an error if the asset is in use or other assets are dependent on it as base.
     * @summary Delete user asset
     * @param {string} userId
     * @param {number} assetId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async deleteAsset(
      userId: string,
      assetId: number,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (axios?: AxiosInstance, basePath?: string) => AxiosPromise<void>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.deleteAsset(
        userId,
        assetId,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["UserAssetsApi.deleteAsset"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Deletes user asset pair and its associated metadata.
     * @summary Delete user asset pair
     * @param {string} userId
     * @param {number} assetId
     * @param {number} referenceId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async deleteAssetPair(
      userId: string,
      assetId: number,
      referenceId: number,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (axios?: AxiosInstance, basePath?: string) => AxiosPromise<void>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.deleteAssetPair(
        userId,
        assetId,
        referenceId,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["UserAssetsApi.deleteAssetPair"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Request with no parameters deletes all rates related to a user asset and its pair. If the parameters are specified, it deletes only the subset of it.
     * @summary Delete user asset pair rates
     * @param {string} userId
     * @param {number} assetId
     * @param {number} referenceId
     * @param {number} startTimestamp From which timestamp delete the rates inclusive.
     * @param {number} endTimestamp Until which timestamp delete the rates inclusive.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async deleteAssetPairRates(
      userId: string,
      assetId: number,
      referenceId: number,
      startTimestamp: number,
      endTimestamp: number,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (axios?: AxiosInstance, basePath?: string) => AxiosPromise<void>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.deleteAssetPairRates(
          userId,
          assetId,
          referenceId,
          startTimestamp,
          endTimestamp,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["UserAssetsApi.deleteAssetPairRates"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Gets an custom asset added by user
     * @summary Get user asset
     * @param {string} userId
     * @param {number} assetId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getUserAsset(
      userId: string,
      assetId: number,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<GetAssetResponse>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getUserAsset(
        userId,
        assetId,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["UserAssetsApi.getUserAsset"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Gets metadata about user asset pair
     * @summary Get user asset pair
     * @param {string} userId
     * @param {number} assetId
     * @param {number} referenceId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getUserAssetPair(
      userId: string,
      assetId: number,
      referenceId: number,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<GetUserAssetPairResponse>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.getUserAssetPair(
          userId,
          assetId,
          referenceId,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["UserAssetsApi.getUserAssetPair"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Gets user asset pair rates based on provided query params
     * @summary Get user asset pair rates
     * @param {string} userId
     * @param {number} assetId
     * @param {number} referenceId
     * @param {string} [range]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getUserAssetPairRates(
      userId: string,
      assetId: number,
      referenceId: number,
      range?: string,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<GetAssetPairRatesResponse>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.getUserAssetPairRates(
          userId,
          assetId,
          referenceId,
          range,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["UserAssetsApi.getUserAssetPairRates"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Gets all custom assets created by the user. Returns unpaginated results with lookup tables.
     * @summary List user assets
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getUserAssets(
      userId: string,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<GetUserAssetsResponse>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getUserAssets(
        userId,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["UserAssetsApi.getUserAssets"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Adds a new reference pair to an existing user asset.
     * @summary Add user asset pair
     * @param {string} userId
     * @param {number} assetId
     * @param {AddAssetPairRequest} addAssetPairRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async postAssetPair(
      userId: string,
      assetId: number,
      addAssetPairRequest: AddAssetPairRequest,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<AddAssetPairResponse>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.postAssetPair(
        userId,
        assetId,
        addAssetPairRequest,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["UserAssetsApi.postAssetPair"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Adds a user defined asset.
     * @summary Add user asset
     * @param {string} userId
     * @param {AddAssetRequest} addAssetRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async postCustomAsset(
      userId: string,
      addAssetRequest: AddAssetRequest,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<AddAssetResponse>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.postCustomAsset(
        userId,
        addAssetRequest,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["UserAssetsApi.postCustomAsset"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Adds a list of user asset pair rates. The list may contain one or many elements. If the rate already exists, error will be returned.
     * @summary Add user asset pair rates
     * @param {string} userId
     * @param {number} assetId
     * @param {number} referenceId
     * @param {AddAssetPairRatesRequest} addAssetPairRatesRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async postCustomAssetRates(
      userId: string,
      assetId: number,
      referenceId: number,
      addAssetPairRatesRequest: AddAssetPairRatesRequest,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<AddAssetPairRatesRequest>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.postCustomAssetRates(
          userId,
          assetId,
          referenceId,
          addAssetPairRatesRequest,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["UserAssetsApi.postCustomAssetRates"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Update already existing user defined asset.
     * @summary Update user asset
     * @param {string} userId
     * @param {number} assetId
     * @param {AddAssetRequest} addAssetRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async putCustomAsset(
      userId: string,
      assetId: number,
      addAssetRequest: AddAssetRequest,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<AddAssetRequest>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.putCustomAsset(
        userId,
        assetId,
        addAssetRequest,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["UserAssetsApi.putCustomAsset"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Change the metadata related to user asset pair. As user asset pair is not uniquely identifiable we do not need a POST to create it. It is created by default as you add rates, and this endpoint serves as a way to add or update metadata.
     * @summary Update user asset pair metadata
     * @param {string} userId
     * @param {number} assetId
     * @param {number} referenceId
     * @param {UserAssetPairMetadata} userAssetPairMetadata
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async putCustomAssetPair(
      userId: string,
      assetId: number,
      referenceId: number,
      userAssetPairMetadata: UserAssetPairMetadata,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<UserAssetPairMetadata>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.putCustomAssetPair(
          userId,
          assetId,
          referenceId,
          userAssetPairMetadata,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["UserAssetsApi.putCustomAssetPair"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
  };
};

/**
 * UserAssetsApi - factory interface
 * @export
 */
export const UserAssetsApiFactory = function (
  configuration?: Configuration,
  basePath?: string,
  axios?: AxiosInstance,
) {
  const localVarFp = UserAssetsApiFp(configuration);
  return {
    /**
     * Deletes manually added user asset along with all the related information about it. Return an error if the asset is in use or other assets are dependent on it as base.
     * @summary Delete user asset
     * @param {string} userId
     * @param {number} assetId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    deleteAsset(
      userId: string,
      assetId: number,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<void> {
      return localVarFp
        .deleteAsset(userId, assetId, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Deletes user asset pair and its associated metadata.
     * @summary Delete user asset pair
     * @param {string} userId
     * @param {number} assetId
     * @param {number} referenceId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    deleteAssetPair(
      userId: string,
      assetId: number,
      referenceId: number,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<void> {
      return localVarFp
        .deleteAssetPair(userId, assetId, referenceId, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Request with no parameters deletes all rates related to a user asset and its pair. If the parameters are specified, it deletes only the subset of it.
     * @summary Delete user asset pair rates
     * @param {string} userId
     * @param {number} assetId
     * @param {number} referenceId
     * @param {number} startTimestamp From which timestamp delete the rates inclusive.
     * @param {number} endTimestamp Until which timestamp delete the rates inclusive.
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    deleteAssetPairRates(
      userId: string,
      assetId: number,
      referenceId: number,
      startTimestamp: number,
      endTimestamp: number,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<void> {
      return localVarFp
        .deleteAssetPairRates(
          userId,
          assetId,
          referenceId,
          startTimestamp,
          endTimestamp,
          options,
        )
        .then((request) => request(axios, basePath));
    },
    /**
     * Gets an custom asset added by user
     * @summary Get user asset
     * @param {string} userId
     * @param {number} assetId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getUserAsset(
      userId: string,
      assetId: number,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<GetAssetResponse> {
      return localVarFp
        .getUserAsset(userId, assetId, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Gets metadata about user asset pair
     * @summary Get user asset pair
     * @param {string} userId
     * @param {number} assetId
     * @param {number} referenceId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getUserAssetPair(
      userId: string,
      assetId: number,
      referenceId: number,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<GetUserAssetPairResponse> {
      return localVarFp
        .getUserAssetPair(userId, assetId, referenceId, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Gets user asset pair rates based on provided query params
     * @summary Get user asset pair rates
     * @param {string} userId
     * @param {number} assetId
     * @param {number} referenceId
     * @param {string} [range]
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getUserAssetPairRates(
      userId: string,
      assetId: number,
      referenceId: number,
      range?: string,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<GetAssetPairRatesResponse> {
      return localVarFp
        .getUserAssetPairRates(userId, assetId, referenceId, range, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Gets all custom assets created by the user. Returns unpaginated results with lookup tables.
     * @summary List user assets
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getUserAssets(
      userId: string,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<GetUserAssetsResponse> {
      return localVarFp
        .getUserAssets(userId, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Adds a new reference pair to an existing user asset.
     * @summary Add user asset pair
     * @param {string} userId
     * @param {number} assetId
     * @param {AddAssetPairRequest} addAssetPairRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    postAssetPair(
      userId: string,
      assetId: number,
      addAssetPairRequest: AddAssetPairRequest,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<AddAssetPairResponse> {
      return localVarFp
        .postAssetPair(userId, assetId, addAssetPairRequest, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Adds a user defined asset.
     * @summary Add user asset
     * @param {string} userId
     * @param {AddAssetRequest} addAssetRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    postCustomAsset(
      userId: string,
      addAssetRequest: AddAssetRequest,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<AddAssetResponse> {
      return localVarFp
        .postCustomAsset(userId, addAssetRequest, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Adds a list of user asset pair rates. The list may contain one or many elements. If the rate already exists, error will be returned.
     * @summary Add user asset pair rates
     * @param {string} userId
     * @param {number} assetId
     * @param {number} referenceId
     * @param {AddAssetPairRatesRequest} addAssetPairRatesRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    postCustomAssetRates(
      userId: string,
      assetId: number,
      referenceId: number,
      addAssetPairRatesRequest: AddAssetPairRatesRequest,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<AddAssetPairRatesRequest> {
      return localVarFp
        .postCustomAssetRates(
          userId,
          assetId,
          referenceId,
          addAssetPairRatesRequest,
          options,
        )
        .then((request) => request(axios, basePath));
    },
    /**
     * Update already existing user defined asset.
     * @summary Update user asset
     * @param {string} userId
     * @param {number} assetId
     * @param {AddAssetRequest} addAssetRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    putCustomAsset(
      userId: string,
      assetId: number,
      addAssetRequest: AddAssetRequest,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<AddAssetRequest> {
      return localVarFp
        .putCustomAsset(userId, assetId, addAssetRequest, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Change the metadata related to user asset pair. As user asset pair is not uniquely identifiable we do not need a POST to create it. It is created by default as you add rates, and this endpoint serves as a way to add or update metadata.
     * @summary Update user asset pair metadata
     * @param {string} userId
     * @param {number} assetId
     * @param {number} referenceId
     * @param {UserAssetPairMetadata} userAssetPairMetadata
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    putCustomAssetPair(
      userId: string,
      assetId: number,
      referenceId: number,
      userAssetPairMetadata: UserAssetPairMetadata,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<UserAssetPairMetadata> {
      return localVarFp
        .putCustomAssetPair(
          userId,
          assetId,
          referenceId,
          userAssetPairMetadata,
          options,
        )
        .then((request) => request(axios, basePath));
    },
  };
};

/**
 * UserAssetsApi - interface
 * @export
 * @interface UserAssetsApi
 */
export interface UserAssetsApiInterface {
  /**
   * Deletes manually added user asset along with all the related information about it. Return an error if the asset is in use or other assets are dependent on it as base.
   * @summary Delete user asset
   * @param {string} userId
   * @param {number} assetId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserAssetsApiInterface
   */
  deleteAsset(
    userId: string,
    assetId: number,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<void>;

  /**
   * Deletes user asset pair and its associated metadata.
   * @summary Delete user asset pair
   * @param {string} userId
   * @param {number} assetId
   * @param {number} referenceId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserAssetsApiInterface
   */
  deleteAssetPair(
    userId: string,
    assetId: number,
    referenceId: number,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<void>;

  /**
   * Request with no parameters deletes all rates related to a user asset and its pair. If the parameters are specified, it deletes only the subset of it.
   * @summary Delete user asset pair rates
   * @param {string} userId
   * @param {number} assetId
   * @param {number} referenceId
   * @param {number} startTimestamp From which timestamp delete the rates inclusive.
   * @param {number} endTimestamp Until which timestamp delete the rates inclusive.
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserAssetsApiInterface
   */
  deleteAssetPairRates(
    userId: string,
    assetId: number,
    referenceId: number,
    startTimestamp: number,
    endTimestamp: number,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<void>;

  /**
   * Gets an custom asset added by user
   * @summary Get user asset
   * @param {string} userId
   * @param {number} assetId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserAssetsApiInterface
   */
  getUserAsset(
    userId: string,
    assetId: number,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<GetAssetResponse>;

  /**
   * Gets metadata about user asset pair
   * @summary Get user asset pair
   * @param {string} userId
   * @param {number} assetId
   * @param {number} referenceId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserAssetsApiInterface
   */
  getUserAssetPair(
    userId: string,
    assetId: number,
    referenceId: number,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<GetUserAssetPairResponse>;

  /**
   * Gets user asset pair rates based on provided query params
   * @summary Get user asset pair rates
   * @param {string} userId
   * @param {number} assetId
   * @param {number} referenceId
   * @param {string} [range]
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserAssetsApiInterface
   */
  getUserAssetPairRates(
    userId: string,
    assetId: number,
    referenceId: number,
    range?: string,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<GetAssetPairRatesResponse>;

  /**
   * Gets all custom assets created by the user. Returns unpaginated results with lookup tables.
   * @summary List user assets
   * @param {string} userId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserAssetsApiInterface
   */
  getUserAssets(
    userId: string,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<GetUserAssetsResponse>;

  /**
   * Adds a new reference pair to an existing user asset.
   * @summary Add user asset pair
   * @param {string} userId
   * @param {number} assetId
   * @param {AddAssetPairRequest} addAssetPairRequest
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserAssetsApiInterface
   */
  postAssetPair(
    userId: string,
    assetId: number,
    addAssetPairRequest: AddAssetPairRequest,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<AddAssetPairResponse>;

  /**
   * Adds a user defined asset.
   * @summary Add user asset
   * @param {string} userId
   * @param {AddAssetRequest} addAssetRequest
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserAssetsApiInterface
   */
  postCustomAsset(
    userId: string,
    addAssetRequest: AddAssetRequest,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<AddAssetResponse>;

  /**
   * Adds a list of user asset pair rates. The list may contain one or many elements. If the rate already exists, error will be returned.
   * @summary Add user asset pair rates
   * @param {string} userId
   * @param {number} assetId
   * @param {number} referenceId
   * @param {AddAssetPairRatesRequest} addAssetPairRatesRequest
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserAssetsApiInterface
   */
  postCustomAssetRates(
    userId: string,
    assetId: number,
    referenceId: number,
    addAssetPairRatesRequest: AddAssetPairRatesRequest,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<AddAssetPairRatesRequest>;

  /**
   * Update already existing user defined asset.
   * @summary Update user asset
   * @param {string} userId
   * @param {number} assetId
   * @param {AddAssetRequest} addAssetRequest
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserAssetsApiInterface
   */
  putCustomAsset(
    userId: string,
    assetId: number,
    addAssetRequest: AddAssetRequest,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<AddAssetRequest>;

  /**
   * Change the metadata related to user asset pair. As user asset pair is not uniquely identifiable we do not need a POST to create it. It is created by default as you add rates, and this endpoint serves as a way to add or update metadata.
   * @summary Update user asset pair metadata
   * @param {string} userId
   * @param {number} assetId
   * @param {number} referenceId
   * @param {UserAssetPairMetadata} userAssetPairMetadata
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserAssetsApiInterface
   */
  putCustomAssetPair(
    userId: string,
    assetId: number,
    referenceId: number,
    userAssetPairMetadata: UserAssetPairMetadata,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<UserAssetPairMetadata>;
}

/**
 * UserAssetsApi - object-oriented interface
 * @export
 * @class UserAssetsApi
 * @extends {BaseAPI}
 */
export class UserAssetsApi extends BaseAPI implements UserAssetsApiInterface {
  /**
   * Deletes manually added user asset along with all the related information about it. Return an error if the asset is in use or other assets are dependent on it as base.
   * @summary Delete user asset
   * @param {string} userId
   * @param {number} assetId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserAssetsApi
   */
  public deleteAsset(
    userId: string,
    assetId: number,
    options?: RawAxiosRequestConfig,
  ) {
    return UserAssetsApiFp(this.configuration)
      .deleteAsset(userId, assetId, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Deletes user asset pair and its associated metadata.
   * @summary Delete user asset pair
   * @param {string} userId
   * @param {number} assetId
   * @param {number} referenceId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserAssetsApi
   */
  public deleteAssetPair(
    userId: string,
    assetId: number,
    referenceId: number,
    options?: RawAxiosRequestConfig,
  ) {
    return UserAssetsApiFp(this.configuration)
      .deleteAssetPair(userId, assetId, referenceId, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Request with no parameters deletes all rates related to a user asset and its pair. If the parameters are specified, it deletes only the subset of it.
   * @summary Delete user asset pair rates
   * @param {string} userId
   * @param {number} assetId
   * @param {number} referenceId
   * @param {number} startTimestamp From which timestamp delete the rates inclusive.
   * @param {number} endTimestamp Until which timestamp delete the rates inclusive.
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserAssetsApi
   */
  public deleteAssetPairRates(
    userId: string,
    assetId: number,
    referenceId: number,
    startTimestamp: number,
    endTimestamp: number,
    options?: RawAxiosRequestConfig,
  ) {
    return UserAssetsApiFp(this.configuration)
      .deleteAssetPairRates(
        userId,
        assetId,
        referenceId,
        startTimestamp,
        endTimestamp,
        options,
      )
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Gets an custom asset added by user
   * @summary Get user asset
   * @param {string} userId
   * @param {number} assetId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserAssetsApi
   */
  public getUserAsset(
    userId: string,
    assetId: number,
    options?: RawAxiosRequestConfig,
  ) {
    return UserAssetsApiFp(this.configuration)
      .getUserAsset(userId, assetId, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Gets metadata about user asset pair
   * @summary Get user asset pair
   * @param {string} userId
   * @param {number} assetId
   * @param {number} referenceId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserAssetsApi
   */
  public getUserAssetPair(
    userId: string,
    assetId: number,
    referenceId: number,
    options?: RawAxiosRequestConfig,
  ) {
    return UserAssetsApiFp(this.configuration)
      .getUserAssetPair(userId, assetId, referenceId, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Gets user asset pair rates based on provided query params
   * @summary Get user asset pair rates
   * @param {string} userId
   * @param {number} assetId
   * @param {number} referenceId
   * @param {string} [range]
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserAssetsApi
   */
  public getUserAssetPairRates(
    userId: string,
    assetId: number,
    referenceId: number,
    range?: string,
    options?: RawAxiosRequestConfig,
  ) {
    return UserAssetsApiFp(this.configuration)
      .getUserAssetPairRates(userId, assetId, referenceId, range, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Gets all custom assets created by the user. Returns unpaginated results with lookup tables.
   * @summary List user assets
   * @param {string} userId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserAssetsApi
   */
  public getUserAssets(userId: string, options?: RawAxiosRequestConfig) {
    return UserAssetsApiFp(this.configuration)
      .getUserAssets(userId, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Adds a new reference pair to an existing user asset.
   * @summary Add user asset pair
   * @param {string} userId
   * @param {number} assetId
   * @param {AddAssetPairRequest} addAssetPairRequest
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserAssetsApi
   */
  public postAssetPair(
    userId: string,
    assetId: number,
    addAssetPairRequest: AddAssetPairRequest,
    options?: RawAxiosRequestConfig,
  ) {
    return UserAssetsApiFp(this.configuration)
      .postAssetPair(userId, assetId, addAssetPairRequest, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Adds a user defined asset.
   * @summary Add user asset
   * @param {string} userId
   * @param {AddAssetRequest} addAssetRequest
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserAssetsApi
   */
  public postCustomAsset(
    userId: string,
    addAssetRequest: AddAssetRequest,
    options?: RawAxiosRequestConfig,
  ) {
    return UserAssetsApiFp(this.configuration)
      .postCustomAsset(userId, addAssetRequest, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Adds a list of user asset pair rates. The list may contain one or many elements. If the rate already exists, error will be returned.
   * @summary Add user asset pair rates
   * @param {string} userId
   * @param {number} assetId
   * @param {number} referenceId
   * @param {AddAssetPairRatesRequest} addAssetPairRatesRequest
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserAssetsApi
   */
  public postCustomAssetRates(
    userId: string,
    assetId: number,
    referenceId: number,
    addAssetPairRatesRequest: AddAssetPairRatesRequest,
    options?: RawAxiosRequestConfig,
  ) {
    return UserAssetsApiFp(this.configuration)
      .postCustomAssetRates(
        userId,
        assetId,
        referenceId,
        addAssetPairRatesRequest,
        options,
      )
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Update already existing user defined asset.
   * @summary Update user asset
   * @param {string} userId
   * @param {number} assetId
   * @param {AddAssetRequest} addAssetRequest
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserAssetsApi
   */
  public putCustomAsset(
    userId: string,
    assetId: number,
    addAssetRequest: AddAssetRequest,
    options?: RawAxiosRequestConfig,
  ) {
    return UserAssetsApiFp(this.configuration)
      .putCustomAsset(userId, assetId, addAssetRequest, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Change the metadata related to user asset pair. As user asset pair is not uniquely identifiable we do not need a POST to create it. It is created by default as you add rates, and this endpoint serves as a way to add or update metadata.
   * @summary Update user asset pair metadata
   * @param {string} userId
   * @param {number} assetId
   * @param {number} referenceId
   * @param {UserAssetPairMetadata} userAssetPairMetadata
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserAssetsApi
   */
  public putCustomAssetPair(
    userId: string,
    assetId: number,
    referenceId: number,
    userAssetPairMetadata: UserAssetPairMetadata,
    options?: RawAxiosRequestConfig,
  ) {
    return UserAssetsApiFp(this.configuration)
      .putCustomAssetPair(
        userId,
        assetId,
        referenceId,
        userAssetPairMetadata,
        options,
      )
      .then((request) => request(this.axios, this.basePath));
  }
}

/**
 * UserCategoriesApi - axios parameter creator
 * @export
 */
export const UserCategoriesApiAxiosParamCreator = function (
  configuration?: Configuration,
) {
  return {
    /**
     * Deletes a user-specific category. Cannot delete global, system categories, or categories with transaction dependencies.
     * @summary Delete Category
     * @param {string} userId
     * @param {number} categoryId Category ID
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    deleteUserCategory: async (
      userId: string,
      categoryId: number,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("deleteUserCategory", "userId", userId);
      // verify required parameter 'categoryId' is not null or undefined
      assertParamExists("deleteUserCategory", "categoryId", categoryId);
      const localVarPath = `/api/users/{user_id}/categories/{category_id}`
        .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)))
        .replace(`{${"category_id"}}`, encodeURIComponent(String(categoryId)));
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "DELETE",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Deletes a user-specific category type. Cannot delete global types or types with category dependencies.
     * @summary Delete Category Type
     * @param {string} userId
     * @param {number} typeId Category type ID
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    deleteUserCategoryType: async (
      userId: string,
      typeId: number,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("deleteUserCategoryType", "userId", userId);
      // verify required parameter 'typeId' is not null or undefined
      assertParamExists("deleteUserCategoryType", "typeId", typeId);
      const localVarPath = `/api/users/{user_id}/categories/types/{type_id}`
        .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)))
        .replace(`{${"type_id"}}`, encodeURIComponent(String(typeId)));
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "DELETE",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Retrieves full list of custom user categories. Does not include global categories.
     * @summary Get Categories
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getCategories: async (
      userId: string,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("getCategories", "userId", userId);
      const localVarPath = `/api/users/{user_id}/categories`.replace(
        `{${"user_id"}}`,
        encodeURIComponent(String(userId)),
      );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Retrieves details of a specific category. User can only access global categories or their own categories.
     * @summary Get Category
     * @param {string} userId
     * @param {number} categoryId Category ID
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getUserCategory: async (
      userId: string,
      categoryId: number,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("getUserCategory", "userId", userId);
      // verify required parameter 'categoryId' is not null or undefined
      assertParamExists("getUserCategory", "categoryId", categoryId);
      const localVarPath = `/api/users/{user_id}/categories/{category_id}`
        .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)))
        .replace(`{${"category_id"}}`, encodeURIComponent(String(categoryId)));
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Retrieves all category types accessible to the user. Includes both global types and user-specific types.
     * @summary Get Category Types
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getUserCategoryTypes: async (
      userId: string,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("getUserCategoryTypes", "userId", userId);
      const localVarPath = `/api/users/{user_id}/categories/types`.replace(
        `{${"user_id"}}`,
        encodeURIComponent(String(userId)),
      );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "GET",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Creates a new user-specific category. Category name must be unique (case-insensitive) across global and user categories. Users are limited to 100 custom categories.
     * @summary Create Category
     * @param {string} userId
     * @param {CreateCategoryRequest} createCategoryRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    postUserCategory: async (
      userId: string,
      createCategoryRequest: CreateCategoryRequest,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("postUserCategory", "userId", userId);
      // verify required parameter 'createCategoryRequest' is not null or undefined
      assertParamExists(
        "postUserCategory",
        "createCategoryRequest",
        createCategoryRequest,
      );
      const localVarPath = `/api/users/{user_id}/categories`.replace(
        `{${"user_id"}}`,
        encodeURIComponent(String(userId)),
      );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "POST",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      localVarHeaderParameter["Content-Type"] = "application/json";

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };
      localVarRequestOptions.data = serializeDataIfNeeded(
        createCategoryRequest,
        localVarRequestOptions,
        configuration,
      );

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Creates a new user-specific category type. Type name must be unique across global and user types. Users are limited to 20 custom types.
     * @summary Create Category Type
     * @param {string} userId
     * @param {CreateCategoryTypeRequest} createCategoryTypeRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    postUserCategoryType: async (
      userId: string,
      createCategoryTypeRequest: CreateCategoryTypeRequest,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("postUserCategoryType", "userId", userId);
      // verify required parameter 'createCategoryTypeRequest' is not null or undefined
      assertParamExists(
        "postUserCategoryType",
        "createCategoryTypeRequest",
        createCategoryTypeRequest,
      );
      const localVarPath = `/api/users/{user_id}/categories/types`.replace(
        `{${"user_id"}}`,
        encodeURIComponent(String(userId)),
      );
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "POST",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      localVarHeaderParameter["Content-Type"] = "application/json";

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };
      localVarRequestOptions.data = serializeDataIfNeeded(
        createCategoryTypeRequest,
        localVarRequestOptions,
        configuration,
      );

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Updates an existing user-specific category. Cannot update global or system categories. Category name must remain unique if changed.
     * @summary Update Category
     * @param {string} userId
     * @param {number} categoryId Category ID
     * @param {CreateCategoryRequest} createCategoryRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    putUserCategory: async (
      userId: string,
      categoryId: number,
      createCategoryRequest: CreateCategoryRequest,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("putUserCategory", "userId", userId);
      // verify required parameter 'categoryId' is not null or undefined
      assertParamExists("putUserCategory", "categoryId", categoryId);
      // verify required parameter 'createCategoryRequest' is not null or undefined
      assertParamExists(
        "putUserCategory",
        "createCategoryRequest",
        createCategoryRequest,
      );
      const localVarPath = `/api/users/{user_id}/categories/{category_id}`
        .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)))
        .replace(`{${"category_id"}}`, encodeURIComponent(String(categoryId)));
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "PUT",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      localVarHeaderParameter["Content-Type"] = "application/json";

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };
      localVarRequestOptions.data = serializeDataIfNeeded(
        createCategoryRequest,
        localVarRequestOptions,
        configuration,
      );

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
    /**
     * Updates an existing user-specific category type. Cannot update global types.
     * @summary Update Category Type
     * @param {string} userId
     * @param {number} typeId Category type ID
     * @param {CreateCategoryTypeRequest} createCategoryTypeRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    putUserCategoryType: async (
      userId: string,
      typeId: number,
      createCategoryTypeRequest: CreateCategoryTypeRequest,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'userId' is not null or undefined
      assertParamExists("putUserCategoryType", "userId", userId);
      // verify required parameter 'typeId' is not null or undefined
      assertParamExists("putUserCategoryType", "typeId", typeId);
      // verify required parameter 'createCategoryTypeRequest' is not null or undefined
      assertParamExists(
        "putUserCategoryType",
        "createCategoryTypeRequest",
        createCategoryTypeRequest,
      );
      const localVarPath = `/api/users/{user_id}/categories/types/{type_id}`
        .replace(`{${"user_id"}}`, encodeURIComponent(String(userId)))
        .replace(`{${"type_id"}}`, encodeURIComponent(String(typeId)));
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "PUT",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      // authentication auth_token required
      // http bearer authentication required
      await setBearerAuthToObject(localVarHeaderParameter, configuration);

      localVarHeaderParameter["Content-Type"] = "application/json";

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };
      localVarRequestOptions.data = serializeDataIfNeeded(
        createCategoryTypeRequest,
        localVarRequestOptions,
        configuration,
      );

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
  };
};

/**
 * UserCategoriesApi - functional programming interface
 * @export
 */
export const UserCategoriesApiFp = function (configuration?: Configuration) {
  const localVarAxiosParamCreator =
    UserCategoriesApiAxiosParamCreator(configuration);
  return {
    /**
     * Deletes a user-specific category. Cannot delete global, system categories, or categories with transaction dependencies.
     * @summary Delete Category
     * @param {string} userId
     * @param {number} categoryId Category ID
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async deleteUserCategory(
      userId: string,
      categoryId: number,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (axios?: AxiosInstance, basePath?: string) => AxiosPromise<void>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.deleteUserCategory(
          userId,
          categoryId,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["UserCategoriesApi.deleteUserCategory"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Deletes a user-specific category type. Cannot delete global types or types with category dependencies.
     * @summary Delete Category Type
     * @param {string} userId
     * @param {number} typeId Category type ID
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async deleteUserCategoryType(
      userId: string,
      typeId: number,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (axios?: AxiosInstance, basePath?: string) => AxiosPromise<void>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.deleteUserCategoryType(
          userId,
          typeId,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["UserCategoriesApi.deleteUserCategoryType"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Retrieves full list of custom user categories. Does not include global categories.
     * @summary Get Categories
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getCategories(
      userId: string,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<GetCategoriesResponse>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getCategories(
        userId,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["UserCategoriesApi.getCategories"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Retrieves details of a specific category. User can only access global categories or their own categories.
     * @summary Get Category
     * @param {string} userId
     * @param {number} categoryId Category ID
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getUserCategory(
      userId: string,
      categoryId: number,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<CategoryIdentifiableCategoryType>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.getUserCategory(
        userId,
        categoryId,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["UserCategoriesApi.getUserCategory"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Retrieves all category types accessible to the user. Includes both global types and user-specific types.
     * @summary Get Category Types
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async getUserCategoryTypes(
      userId: string,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<CategoryMetadataLookupTables>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.getUserCategoryTypes(userId, options);
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["UserCategoriesApi.getUserCategoryTypes"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Creates a new user-specific category. Category name must be unique (case-insensitive) across global and user categories. Users are limited to 100 custom categories.
     * @summary Create Category
     * @param {string} userId
     * @param {CreateCategoryRequest} createCategoryRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async postUserCategory(
      userId: string,
      createCategoryRequest: CreateCategoryRequest,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<IdentifiableCategoryIdentifiableCategoryType>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.postUserCategory(
          userId,
          createCategoryRequest,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["UserCategoriesApi.postUserCategory"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Creates a new user-specific category type. Type name must be unique across global and user types. Users are limited to 20 custom types.
     * @summary Create Category Type
     * @param {string} userId
     * @param {CreateCategoryTypeRequest} createCategoryTypeRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async postUserCategoryType(
      userId: string,
      createCategoryTypeRequest: CreateCategoryTypeRequest,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<IdentifiableCategoryType>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.postUserCategoryType(
          userId,
          createCategoryTypeRequest,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["UserCategoriesApi.postUserCategoryType"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Updates an existing user-specific category. Cannot update global or system categories. Category name must remain unique if changed.
     * @summary Update Category
     * @param {string} userId
     * @param {number} categoryId Category ID
     * @param {CreateCategoryRequest} createCategoryRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async putUserCategory(
      userId: string,
      categoryId: number,
      createCategoryRequest: CreateCategoryRequest,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (
        axios?: AxiosInstance,
        basePath?: string,
      ) => AxiosPromise<CategoryIdentifiableCategoryType>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.putUserCategory(
        userId,
        categoryId,
        createCategoryRequest,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["UserCategoriesApi.putUserCategory"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
    /**
     * Updates an existing user-specific category type. Cannot update global types.
     * @summary Update Category Type
     * @param {string} userId
     * @param {number} typeId Category type ID
     * @param {CreateCategoryTypeRequest} createCategoryTypeRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async putUserCategoryType(
      userId: string,
      typeId: number,
      createCategoryTypeRequest: CreateCategoryTypeRequest,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (axios?: AxiosInstance, basePath?: string) => AxiosPromise<CategoryType>
    > {
      const localVarAxiosArgs =
        await localVarAxiosParamCreator.putUserCategoryType(
          userId,
          typeId,
          createCategoryTypeRequest,
          options,
        );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["UserCategoriesApi.putUserCategoryType"]?.[
          localVarOperationServerIndex
        ]?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
  };
};

/**
 * UserCategoriesApi - factory interface
 * @export
 */
export const UserCategoriesApiFactory = function (
  configuration?: Configuration,
  basePath?: string,
  axios?: AxiosInstance,
) {
  const localVarFp = UserCategoriesApiFp(configuration);
  return {
    /**
     * Deletes a user-specific category. Cannot delete global, system categories, or categories with transaction dependencies.
     * @summary Delete Category
     * @param {string} userId
     * @param {number} categoryId Category ID
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    deleteUserCategory(
      userId: string,
      categoryId: number,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<void> {
      return localVarFp
        .deleteUserCategory(userId, categoryId, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Deletes a user-specific category type. Cannot delete global types or types with category dependencies.
     * @summary Delete Category Type
     * @param {string} userId
     * @param {number} typeId Category type ID
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    deleteUserCategoryType(
      userId: string,
      typeId: number,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<void> {
      return localVarFp
        .deleteUserCategoryType(userId, typeId, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Retrieves full list of custom user categories. Does not include global categories.
     * @summary Get Categories
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getCategories(
      userId: string,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<GetCategoriesResponse> {
      return localVarFp
        .getCategories(userId, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Retrieves details of a specific category. User can only access global categories or their own categories.
     * @summary Get Category
     * @param {string} userId
     * @param {number} categoryId Category ID
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getUserCategory(
      userId: string,
      categoryId: number,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<CategoryIdentifiableCategoryType> {
      return localVarFp
        .getUserCategory(userId, categoryId, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Retrieves all category types accessible to the user. Includes both global types and user-specific types.
     * @summary Get Category Types
     * @param {string} userId
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    getUserCategoryTypes(
      userId: string,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<CategoryMetadataLookupTables> {
      return localVarFp
        .getUserCategoryTypes(userId, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Creates a new user-specific category. Category name must be unique (case-insensitive) across global and user categories. Users are limited to 100 custom categories.
     * @summary Create Category
     * @param {string} userId
     * @param {CreateCategoryRequest} createCategoryRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    postUserCategory(
      userId: string,
      createCategoryRequest: CreateCategoryRequest,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<IdentifiableCategoryIdentifiableCategoryType> {
      return localVarFp
        .postUserCategory(userId, createCategoryRequest, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Creates a new user-specific category type. Type name must be unique across global and user types. Users are limited to 20 custom types.
     * @summary Create Category Type
     * @param {string} userId
     * @param {CreateCategoryTypeRequest} createCategoryTypeRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    postUserCategoryType(
      userId: string,
      createCategoryTypeRequest: CreateCategoryTypeRequest,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<IdentifiableCategoryType> {
      return localVarFp
        .postUserCategoryType(userId, createCategoryTypeRequest, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Updates an existing user-specific category. Cannot update global or system categories. Category name must remain unique if changed.
     * @summary Update Category
     * @param {string} userId
     * @param {number} categoryId Category ID
     * @param {CreateCategoryRequest} createCategoryRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    putUserCategory(
      userId: string,
      categoryId: number,
      createCategoryRequest: CreateCategoryRequest,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<CategoryIdentifiableCategoryType> {
      return localVarFp
        .putUserCategory(userId, categoryId, createCategoryRequest, options)
        .then((request) => request(axios, basePath));
    },
    /**
     * Updates an existing user-specific category type. Cannot update global types.
     * @summary Update Category Type
     * @param {string} userId
     * @param {number} typeId Category type ID
     * @param {CreateCategoryTypeRequest} createCategoryTypeRequest
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    putUserCategoryType(
      userId: string,
      typeId: number,
      createCategoryTypeRequest: CreateCategoryTypeRequest,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<CategoryType> {
      return localVarFp
        .putUserCategoryType(userId, typeId, createCategoryTypeRequest, options)
        .then((request) => request(axios, basePath));
    },
  };
};

/**
 * UserCategoriesApi - interface
 * @export
 * @interface UserCategoriesApi
 */
export interface UserCategoriesApiInterface {
  /**
   * Deletes a user-specific category. Cannot delete global, system categories, or categories with transaction dependencies.
   * @summary Delete Category
   * @param {string} userId
   * @param {number} categoryId Category ID
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserCategoriesApiInterface
   */
  deleteUserCategory(
    userId: string,
    categoryId: number,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<void>;

  /**
   * Deletes a user-specific category type. Cannot delete global types or types with category dependencies.
   * @summary Delete Category Type
   * @param {string} userId
   * @param {number} typeId Category type ID
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserCategoriesApiInterface
   */
  deleteUserCategoryType(
    userId: string,
    typeId: number,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<void>;

  /**
   * Retrieves full list of custom user categories. Does not include global categories.
   * @summary Get Categories
   * @param {string} userId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserCategoriesApiInterface
   */
  getCategories(
    userId: string,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<GetCategoriesResponse>;

  /**
   * Retrieves details of a specific category. User can only access global categories or their own categories.
   * @summary Get Category
   * @param {string} userId
   * @param {number} categoryId Category ID
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserCategoriesApiInterface
   */
  getUserCategory(
    userId: string,
    categoryId: number,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<CategoryIdentifiableCategoryType>;

  /**
   * Retrieves all category types accessible to the user. Includes both global types and user-specific types.
   * @summary Get Category Types
   * @param {string} userId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserCategoriesApiInterface
   */
  getUserCategoryTypes(
    userId: string,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<CategoryMetadataLookupTables>;

  /**
   * Creates a new user-specific category. Category name must be unique (case-insensitive) across global and user categories. Users are limited to 100 custom categories.
   * @summary Create Category
   * @param {string} userId
   * @param {CreateCategoryRequest} createCategoryRequest
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserCategoriesApiInterface
   */
  postUserCategory(
    userId: string,
    createCategoryRequest: CreateCategoryRequest,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<IdentifiableCategoryIdentifiableCategoryType>;

  /**
   * Creates a new user-specific category type. Type name must be unique across global and user types. Users are limited to 20 custom types.
   * @summary Create Category Type
   * @param {string} userId
   * @param {CreateCategoryTypeRequest} createCategoryTypeRequest
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserCategoriesApiInterface
   */
  postUserCategoryType(
    userId: string,
    createCategoryTypeRequest: CreateCategoryTypeRequest,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<IdentifiableCategoryType>;

  /**
   * Updates an existing user-specific category. Cannot update global or system categories. Category name must remain unique if changed.
   * @summary Update Category
   * @param {string} userId
   * @param {number} categoryId Category ID
   * @param {CreateCategoryRequest} createCategoryRequest
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserCategoriesApiInterface
   */
  putUserCategory(
    userId: string,
    categoryId: number,
    createCategoryRequest: CreateCategoryRequest,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<CategoryIdentifiableCategoryType>;

  /**
   * Updates an existing user-specific category type. Cannot update global types.
   * @summary Update Category Type
   * @param {string} userId
   * @param {number} typeId Category type ID
   * @param {CreateCategoryTypeRequest} createCategoryTypeRequest
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserCategoriesApiInterface
   */
  putUserCategoryType(
    userId: string,
    typeId: number,
    createCategoryTypeRequest: CreateCategoryTypeRequest,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<CategoryType>;
}

/**
 * UserCategoriesApi - object-oriented interface
 * @export
 * @class UserCategoriesApi
 * @extends {BaseAPI}
 */
export class UserCategoriesApi
  extends BaseAPI
  implements UserCategoriesApiInterface
{
  /**
   * Deletes a user-specific category. Cannot delete global, system categories, or categories with transaction dependencies.
   * @summary Delete Category
   * @param {string} userId
   * @param {number} categoryId Category ID
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserCategoriesApi
   */
  public deleteUserCategory(
    userId: string,
    categoryId: number,
    options?: RawAxiosRequestConfig,
  ) {
    return UserCategoriesApiFp(this.configuration)
      .deleteUserCategory(userId, categoryId, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Deletes a user-specific category type. Cannot delete global types or types with category dependencies.
   * @summary Delete Category Type
   * @param {string} userId
   * @param {number} typeId Category type ID
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserCategoriesApi
   */
  public deleteUserCategoryType(
    userId: string,
    typeId: number,
    options?: RawAxiosRequestConfig,
  ) {
    return UserCategoriesApiFp(this.configuration)
      .deleteUserCategoryType(userId, typeId, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Retrieves full list of custom user categories. Does not include global categories.
   * @summary Get Categories
   * @param {string} userId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserCategoriesApi
   */
  public getCategories(userId: string, options?: RawAxiosRequestConfig) {
    return UserCategoriesApiFp(this.configuration)
      .getCategories(userId, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Retrieves details of a specific category. User can only access global categories or their own categories.
   * @summary Get Category
   * @param {string} userId
   * @param {number} categoryId Category ID
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserCategoriesApi
   */
  public getUserCategory(
    userId: string,
    categoryId: number,
    options?: RawAxiosRequestConfig,
  ) {
    return UserCategoriesApiFp(this.configuration)
      .getUserCategory(userId, categoryId, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Retrieves all category types accessible to the user. Includes both global types and user-specific types.
   * @summary Get Category Types
   * @param {string} userId
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserCategoriesApi
   */
  public getUserCategoryTypes(userId: string, options?: RawAxiosRequestConfig) {
    return UserCategoriesApiFp(this.configuration)
      .getUserCategoryTypes(userId, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Creates a new user-specific category. Category name must be unique (case-insensitive) across global and user categories. Users are limited to 100 custom categories.
   * @summary Create Category
   * @param {string} userId
   * @param {CreateCategoryRequest} createCategoryRequest
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserCategoriesApi
   */
  public postUserCategory(
    userId: string,
    createCategoryRequest: CreateCategoryRequest,
    options?: RawAxiosRequestConfig,
  ) {
    return UserCategoriesApiFp(this.configuration)
      .postUserCategory(userId, createCategoryRequest, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Creates a new user-specific category type. Type name must be unique across global and user types. Users are limited to 20 custom types.
   * @summary Create Category Type
   * @param {string} userId
   * @param {CreateCategoryTypeRequest} createCategoryTypeRequest
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserCategoriesApi
   */
  public postUserCategoryType(
    userId: string,
    createCategoryTypeRequest: CreateCategoryTypeRequest,
    options?: RawAxiosRequestConfig,
  ) {
    return UserCategoriesApiFp(this.configuration)
      .postUserCategoryType(userId, createCategoryTypeRequest, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Updates an existing user-specific category. Cannot update global or system categories. Category name must remain unique if changed.
   * @summary Update Category
   * @param {string} userId
   * @param {number} categoryId Category ID
   * @param {CreateCategoryRequest} createCategoryRequest
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserCategoriesApi
   */
  public putUserCategory(
    userId: string,
    categoryId: number,
    createCategoryRequest: CreateCategoryRequest,
    options?: RawAxiosRequestConfig,
  ) {
    return UserCategoriesApiFp(this.configuration)
      .putUserCategory(userId, categoryId, createCategoryRequest, options)
      .then((request) => request(this.axios, this.basePath));
  }

  /**
   * Updates an existing user-specific category type. Cannot update global types.
   * @summary Update Category Type
   * @param {string} userId
   * @param {number} typeId Category type ID
   * @param {CreateCategoryTypeRequest} createCategoryTypeRequest
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UserCategoriesApi
   */
  public putUserCategoryType(
    userId: string,
    typeId: number,
    createCategoryTypeRequest: CreateCategoryTypeRequest,
    options?: RawAxiosRequestConfig,
  ) {
    return UserCategoriesApiFp(this.configuration)
      .putUserCategoryType(userId, typeId, createCategoryTypeRequest, options)
      .then((request) => request(this.axios, this.basePath));
  }
}

/**
 * UsersApi - axios parameter creator
 * @export
 */
export const UsersApiAxiosParamCreator = function (
  configuration?: Configuration,
) {
  return {
    /**
     * Creates a new user account with the provided username and password.
     * @summary Register a new user
     * @param {AddUser} addUser
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    postUser: async (
      addUser: AddUser,
      options: RawAxiosRequestConfig = {},
    ): Promise<RequestArgs> => {
      // verify required parameter 'addUser' is not null or undefined
      assertParamExists("postUser", "addUser", addUser);
      const localVarPath = `/api/users`;
      // use dummy base URL string because the URL constructor only accepts absolute URLs.
      const localVarUrlObj = new URL(localVarPath, DUMMY_BASE_URL);
      let baseOptions;
      if (configuration) {
        baseOptions = configuration.baseOptions;
      }

      const localVarRequestOptions = {
        method: "POST",
        ...baseOptions,
        ...options,
      };
      const localVarHeaderParameter = {} as any;
      const localVarQueryParameter = {} as any;

      localVarHeaderParameter["Content-Type"] = "application/json";

      setSearchParams(localVarUrlObj, localVarQueryParameter);
      let headersFromBaseOptions =
        baseOptions && baseOptions.headers ? baseOptions.headers : {};
      localVarRequestOptions.headers = {
        ...localVarHeaderParameter,
        ...headersFromBaseOptions,
        ...options.headers,
      };
      localVarRequestOptions.data = serializeDataIfNeeded(
        addUser,
        localVarRequestOptions,
        configuration,
      );

      return {
        url: toPathString(localVarUrlObj),
        options: localVarRequestOptions,
      };
    },
  };
};

/**
 * UsersApi - functional programming interface
 * @export
 */
export const UsersApiFp = function (configuration?: Configuration) {
  const localVarAxiosParamCreator = UsersApiAxiosParamCreator(configuration);
  return {
    /**
     * Creates a new user account with the provided username and password.
     * @summary Register a new user
     * @param {AddUser} addUser
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    async postUser(
      addUser: AddUser,
      options?: RawAxiosRequestConfig,
    ): Promise<
      (axios?: AxiosInstance, basePath?: string) => AxiosPromise<RegisteredUser>
    > {
      const localVarAxiosArgs = await localVarAxiosParamCreator.postUser(
        addUser,
        options,
      );
      const localVarOperationServerIndex = configuration?.serverIndex ?? 0;
      const localVarOperationServerBasePath =
        operationServerMap["UsersApi.postUser"]?.[localVarOperationServerIndex]
          ?.url;
      return (axios, basePath) =>
        createRequestFunction(
          localVarAxiosArgs,
          globalAxios,
          BASE_PATH,
          configuration,
        )(axios, localVarOperationServerBasePath || basePath);
    },
  };
};

/**
 * UsersApi - factory interface
 * @export
 */
export const UsersApiFactory = function (
  configuration?: Configuration,
  basePath?: string,
  axios?: AxiosInstance,
) {
  const localVarFp = UsersApiFp(configuration);
  return {
    /**
     * Creates a new user account with the provided username and password.
     * @summary Register a new user
     * @param {AddUser} addUser
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     */
    postUser(
      addUser: AddUser,
      options?: RawAxiosRequestConfig,
    ): AxiosPromise<RegisteredUser> {
      return localVarFp
        .postUser(addUser, options)
        .then((request) => request(axios, basePath));
    },
  };
};

/**
 * UsersApi - interface
 * @export
 * @interface UsersApi
 */
export interface UsersApiInterface {
  /**
   * Creates a new user account with the provided username and password.
   * @summary Register a new user
   * @param {AddUser} addUser
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UsersApiInterface
   */
  postUser(
    addUser: AddUser,
    options?: RawAxiosRequestConfig,
  ): AxiosPromise<RegisteredUser>;
}

/**
 * UsersApi - object-oriented interface
 * @export
 * @class UsersApi
 * @extends {BaseAPI}
 */
export class UsersApi extends BaseAPI implements UsersApiInterface {
  /**
   * Creates a new user account with the provided username and password.
   * @summary Register a new user
   * @param {AddUser} addUser
   * @param {*} [options] Override http request option.
   * @throws {RequiredError}
   * @memberof UsersApi
   */
  public postUser(addUser: AddUser, options?: RawAxiosRequestConfig) {
    return UsersApiFp(this.configuration)
      .postUser(addUser, options)
      .then((request) => request(this.axios, this.basePath));
  }
}
