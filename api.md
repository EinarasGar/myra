# API specifications

## Users
### Registering or adding a new user

`POST /users`
Request:
``` json
{
    "email" : "me@einaras.dev",
    "password" : "plaintextpassword"
}
```

Response:

```json
{
    "id" : 123,
    "email" : "me@einaras.dev",
    "default_asset" : 0
} 
```
### Getting a user by id

`GET /users/{user_id}`

Response:

```json
{
    "id" : 123,
    "email" : "me@einaras.dev",
    "default_asset" : 0,
} 
```
### Update user information

`PATCH /users/{id}`

Request:
``` json
{
    "password" : "plaintextpassword2",
    "default_asset" : 2,
}
```

Response:

```json
{
    "id" : 123,
    "email" : "me@einaras.dev",
    "default_asset" : 2,
} 
```
### Deleting user
`DELETE /users/{id}`

---

## Auth

### Get auth token
`POST /auth`
Request:
``` json
{
    "email" : "me@einaras.dev",
    "password" : "plaintextpassword"
}
```
### Delete auth token / logout
`DELETE /auth/{token}`


---
## Porfolio

`GET /users/{id}/portfolio`

Response: `Ticker, Name, Category, Id, sum`

```json
{
    [
        {"APPL","Apple",1,123,2.3},
        {"BTC","Bitcoin",2,581,0.00002},
        {"VUSA","S&P 500",3,321,2},
        {"GBP","Pounds",4,1233,2000},
    ]
} 
```

`GET /users/{id}/portfolio/history`

Optional parameters:
```
start-timestamp={unix_timestamp}
end-timestamp={unix_timestamp}
frequency={minute/hour/day/week/month}
asset-id={asset_id}
category-id={category_id}
```
Response:

```json
{
    [
        {
            "date": "2023-02-20 22:59:01",
            "asset_id" : 123,
            "reference_asset_id" : 334,
            "sum" : 432.1
        },
        {
            "date": "2023-02-20 22:59:01",
            "asset_id" : 124,
            "reference_asset_id" : 334,
            "sum" : 12.5
        },
        {
            "date": "2023-02-19 22:59:01",
            "asset_id" : 123,
            "reference_asset_id" : 334,
            "sum" : 419.91
        },
    ]
} 
```
## Transactions
`GET /users/{id}/transactions`

Response:
```json
{
    [
        //Transaction group
        123: [
            {
                //Plus APPLE stock
                "id": 41234,
                "asset_id": 123,
                "quantity": 2,
                "category": 1,
                "date": 1677972937,
                "description": "Monthly apple investment"
            },
            {
                //Minus money for the stock
                "id": 41235,
                "asset_id": 1233,
                "quantity": -600,
                "category": 1,
                "date": 1677972937,
                "file": {
                    "type": 1,
                    "description": "bank statement for purchase",
                    "file": "someBase64String"
                }
            },
            {
                //Minus fees
                "id": 41236,
                "asset_id": 1233,
                "quantity": -0.5,
                "category": 5,
                "date": 1677972937,
            }
        ]
    ]
}
```


`POST /users/{id}/transactions`

Request:
``` json
{
    [
        {
            //Plus APPLE stock
            "asset_id": 123,
            "quantity": 2,
            "category": 1,
            "date": 1677972937,
            "description": "Monthly apple investment"
        },
        {
            //Minus money for the stock
            "asset_id": 1233,
            "quantity": -600,
            "category": 1,
            "date": 1677972937,
            "file": {
                "type": 1,
                "description": "bank statement for purchase",
                "file": "someBase64String"
            }
        },
        {
            //Minus fees
            "asset_id": 1233,
            "quantity": -0.5,
            "category": 5,
            "date": 1677972937,
        }          
    ]    
}
```

Response:
```json
{
        //Transaction group
        123: [
            {
                //Plus APPLE stock
                "id": 41234,
                "asset_id": 123,
                "quantity": 2,
                "category": 1,
                "date": 1677972937,
                "description": "Monthly apple investment"
            },
            {
                //Minus money for the stock
                "id": 41235,
                "asset_id": 1233,
                "quantity": -600,
                "category": 1,
                "date": 1677972937,
                "file": {
                    "type": 1,
                    "description": "bank statement for purchase",
                    "file": "someBase64String"
                }
            },
            {
                //Minus fees
                "id": 41236,
                "asset_id": 1233,
                "quantity": -0.5,
                "category": 5,
                "date": 1677972937,
            }
        ]
    ]
}
```

`DELETE /users/{id}/transactions/{transacrion_group_id}`

`DELETE /users/{id}/transactions/{transacrion_group_id}/{sub_transaction_id}`

## Assets

`GET /assets/{id}`

Response:
```json
{
    "id":123,
    "asset_type": 1,
    "ticker": "APPL",
    "name": "Apple"
}
```

`GET /assets`

Optional parameters
```
asset-type={number}
search={name or ticker string}
```

Response:
```json
{
    [
        {
            "id":123,
            "asset_type": 1,
            "ticker": "APPL",
            "name": "Apple"
        },
        {
            "id":1233,
            "asset_type": 2,
            "ticker": "GBP",
            "name": "Pound"
        }
    ]
   
}
```

## Constants

`GET /constants`


Response:
```json
{
    [
        "asset_types": [
            1: "Currencies",
            2: "Stock",
            3: "ETFs",
            4: "Crypto",
        ],
        "transaction_categories": [
            1: "Investments",
            2: "Food",
            3: "Car",
            4: "Bills",
            5: "Fees",
        ]
    ]
   
}
```