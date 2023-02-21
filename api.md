# API specifications

## Users
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
    "default_asset" : 0,
    "token" : "aaabbbccc..."
} 
```

`GET /users/current`

Request if unauthorized:
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
    "default_asset" : 0,
    "token" : "aaabbbccc..."
} 
```

`GET /users/{id}`

Response:

```json
{
    "id" : {id},
    "email" : "another@email.com",
    "default_asset" :123,
} 
```

`PUT /users/{id_or_current}`

Request:
``` json
{
    "email" : "me+2@einaras.dev",
    "password" : "plaintextpassword2",
    "default_asset" : 1,
}
```

Response:

```json
{
    "id" : 123,
    "email" : "me+2@einaras.dev",
    "default_asset" : 1,
} 
```
`DELETE /users/{id_or_current}`

`DELETE /users/{id_or_current}/tokens`

`DELETE /users/{id_or_current}/tokens/{token}`

---

`GET /users/{id_or_current}/portfolio`

Response:

```json
{
    [
        {asset_id,sum},
        {1,0.5},
        {23,2},
        {344,2000}...
    ]
} 
```

`GET /users/{id_or_current}/portfolio/{category}`

Response:

```json
{
    [
        {23,2},
        {344,2000}...
    ]
} 
```

`GET /users/{id_or_current}/portfolio/history`

`GET /users/{id_or_current}/portfolio/history/{timeframe}`

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
            "sum" : 420.91
        },
        ...
    ]
} 
```