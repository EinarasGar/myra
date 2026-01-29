#!/bin/bash

BASE_URL="http://localhost:5173/api"
USER_ID="2396480f-0052-4cf0-81dc-8cedbde5ce13"

echo "=== Creating User Category Types ==="

curl -s -X POST "$BASE_URL/users/$USER_ID/categories/types" \
  -H "Content-Type: application/json" \
  -d '{"name":"Subscriptions"}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories/types" \
  -H "Content-Type: application/json" \
  -d '{"name":"Side Hustle"}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories/types" \
  -H "Content-Type: application/json" \
  -d '{"name":"Pets"}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories/types" \
  -H "Content-Type: application/json" \
  -d '{"name":"Kids"}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories/types" \
  -H "Content-Type: application/json" \
  -d '{"name":"Home Improvement"}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories/types" \
  -H "Content-Type: application/json" \
  -d '{"name":"Education"}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories/types" \
  -H "Content-Type: application/json" \
  -d '{"name":"Hobbies"}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories/types" \
  -H "Content-Type: application/json" \
  -d '{"name":"Charity"}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories/types" \
  -H "Content-Type: application/json" \
  -d '{"name":"Savings"}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories/types" \
  -H "Content-Type: application/json" \
  -d '{"name":"Debt Repayment"}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories/types" \
  -H "Content-Type: application/json" \
  -d '{"name":"Business"}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories/types" \
  -H "Content-Type: application/json" \
  -d '{"name":"Taxes"}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories/types" \
  -H "Content-Type: application/json" \
  -d '{"name":"Entertainment"}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories/types" \
  -H "Content-Type: application/json" \
  -d '{"name":"Healthcare"}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories/types" \
  -H "Content-Type: application/json" \
  -d '{"name":"Transportation"}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories/types" \
  -H "Content-Type: application/json" \
  -d '{"name":"Food & Dining"}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories/types" \
  -H "Content-Type: application/json" \
  -d '{"name":"Shopping"}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories/types" \
  -H "Content-Type: application/json" \
  -d '{"name":"Gifts & Donations"}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories/types" \
  -H "Content-Type: application/json" \
  -d '{"name":"Personal Care"}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories/types" \
  -H "Content-Type: application/json" \
  -d '{"name":"Miscellaneous"}' && echo ""

echo ""
echo "=== Creating User Categories ==="

# Categories using global types (1=Income, 2=Expense, 3=Investments, 4=Fees)

# Expense categories (type 2)
curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Car Payment","icon":"car","category_type_id":2}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Gas","icon":"fuel","category_type_id":2}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Rent","icon":"home","category_type_id":2}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Utilities","icon":"zap","category_type_id":2}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Internet","icon":"wifi","category_type_id":2}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Phone Bill","icon":"phone","category_type_id":2}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Insurance","icon":"shield","category_type_id":2}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Healthcare","icon":"heart","category_type_id":2}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Gym Membership","icon":"dumbbell","category_type_id":2}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Dining Out","icon":"utensils","category_type_id":2}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Coffee","icon":"coffee","category_type_id":2}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Clothing","icon":"shirt","category_type_id":2}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Travel","icon":"plane","category_type_id":2}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Gifts","icon":"gift","category_type_id":2}' && echo ""

# Income categories (type 1)
curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Salary","icon":"wallet","category_type_id":1}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Bonus","icon":"party-popper","category_type_id":1}' && echo ""

# Investment categories (type 3)
curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Stock Purchase","icon":"trending-up","category_type_id":3}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Crypto","icon":"bitcoin","category_type_id":3}' && echo ""

# Fee categories (type 4)
curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Bank Fees","icon":"landmark","category_type_id":4}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"ATM Fees","icon":"banknote","category_type_id":4}' && echo ""

# Categories using user-created types (5=Subscriptions, 6=Side Hustle, 7=Pets, 8=Kids)

# Subscriptions (type 5)
curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Netflix","icon":"tv","category_type_id":5}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Spotify","icon":"music","category_type_id":5}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"YouTube Premium","icon":"youtube","category_type_id":5}' && echo ""

# Side Hustle (type 6)
curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Freelance Income","icon":"briefcase","category_type_id":6}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Etsy Sales","icon":"store","category_type_id":6}' && echo ""

# Pets (type 7)
curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Dog Food","icon":"dog","category_type_id":7}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Vet Bills","icon":"stethoscope","category_type_id":7}' && echo ""

# Kids (type 8)
curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"School Supplies","icon":"book","category_type_id":8}' && echo ""

curl -s -X POST "$BASE_URL/users/$USER_ID/categories" \
  -H "Content-Type: application/json" \
  -d '{"category":"Daycare","icon":"baby","category_type_id":8}' && echo ""

echo ""
echo "=== Done ==="
