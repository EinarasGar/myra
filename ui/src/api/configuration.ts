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

export interface ConfigurationParameters {
  apiKey?:
    | string
    | Promise<string>
    | ((name: string) => string)
    | ((name: string) => Promise<string>);
  username?: string;
  password?: string;
  accessToken?:
    | string
    | Promise<string>
    | ((name?: string, scopes?: string[]) => string)
    | ((name?: string, scopes?: string[]) => Promise<string>);
  basePath?: string;
  serverIndex?: number;
  baseOptions?: any;
  formDataCtor?: new () => any;
}

export class Configuration {
  /**
   * parameter for apiKey security
   * @param name security name
   * @memberof Configuration
   */
  apiKey?:
    | string
    | Promise<string>
    | ((name: string) => string)
    | ((name: string) => Promise<string>);
  /**
   * parameter for basic security
   *
   * @type {string}
   * @memberof Configuration
   */
  username?: string;
  /**
   * parameter for basic security
   *
   * @type {string}
   * @memberof Configuration
   */
  password?: string;
  /**
   * parameter for oauth2 security
   * @param name security name
   * @param scopes oauth2 scope
   * @memberof Configuration
   */
  accessToken?:
    | string
    | Promise<string>
    | ((name?: string, scopes?: string[]) => string)
    | ((name?: string, scopes?: string[]) => Promise<string>);
  /**
   * override base path
   *
   * @type {string}
   * @memberof Configuration
   */
  basePath?: string;
  /**
   * override server index
   *
   * @type {number}
   * @memberof Configuration
   */
  serverIndex?: number;
  /**
   * base options for axios calls
   *
   * @type {any}
   * @memberof Configuration
   */
  baseOptions?: any;
  /**
   * The FormData constructor that will be used to create multipart form data
   * requests. You can inject this here so that execution environments that
   * do not support the FormData class can still run the generated client.
   *
   * @type {new () => FormData}
   */
  formDataCtor?: new () => any;

  constructor(param: ConfigurationParameters = {}) {
    this.apiKey = param.apiKey;
    this.username = param.username;
    this.password = param.password;
    this.accessToken = param.accessToken;
    this.basePath = param.basePath;
    this.serverIndex = param.serverIndex;
    this.baseOptions = {
      headers: {
        ...param.baseOptions?.headers,
        "User-Agent": "OpenAPI-Generator/typescript-axios",
      },
      ...param.baseOptions,
    };
    this.formDataCtor = param.formDataCtor;
  }

  /**
   * Check if the given MIME is a JSON MIME.
   * JSON MIME examples:
   *   application/json
   *   application/json; charset=UTF8
   *   APPLICATION/JSON
   *   application/vnd.company+json
   * @param mime - MIME (Multipurpose Internet Mail Extensions)
   * @return True if the given MIME is JSON, false otherwise.
   */
  public isJsonMime(mime: string): boolean {
    const jsonMime: RegExp = new RegExp(
      "^(application\/json|[^;/ \t]+\/[^;/ \t]+[+]json)[ \t]*(;.*)?$",
      "i",
    );
    return (
      mime !== null &&
      (jsonMime.test(mime) ||
        mime.toLowerCase() === "application/json-patch+json")
    );
  }
}
