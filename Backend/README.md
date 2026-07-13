# EKKA1KM BACKEND

Production-ready Google Apps Script backend for Ekka1km, a hyperlocal JSON REST API backed by Google Sheets.

## Project IDs

- Google Spreadsheet ID: `1MXxrtbU5g9t1979aoBnlVsWAI5VIHbu_`
- Apps Script Script ID: `1rz6xWK8yrRxu9aI-unpn7uMPxjshAN5arIp8VAxofIiXGc-LF89DCoBi`
- Current Web App URL: `https://script.google.com/macros/s/AKfycbwJL8TGAbUPWalbYLlSDu49348XmuvyplQrggKe42vkWwitE6XMTL14bzXk7VQAbl8kRw/exec`

## Setup

```bash
npm install -g @google/clasp
clasp login
clasp push
```

Deploy the Apps Script project as a Web App with access set to the intended audience.

## API Response Format

```json
{
  "success": true,
  "message": "",
  "timestamp": "",
  "data": {}
}
```

## Routes

- `?action=test`
- `?action=settings`
- `?action=products`
- `?action=product&id=PRODUCT_ID`
- `?action=users`
- `?action=profile&userId=USER_ID`
- `?action=login`
- `?action=register`
- `?action=wallet`
- `?action=wallettransactions`
- `?action=orders`
- `?action=media`
- `?action=promotioncampaigns`
- `?action=news`
- `?action=businesses`
- `?action=properties`
- `?action=advertisements`
- `?action=live`
- `?action=search`
- `?action=admin`

## CRUD Pattern

List records:

```http
GET /exec?action=products
```

Get one record:

```http
GET /exec?action=product&id=PRODUCT_ID
```

Create a record:

```http
POST /exec?action=products
Content-Type: application/json

{
  "method": "create",
  "title": "Fresh mangoes",
  "category": "Grocery",
  "price": 120,
  "latitude": 28.6139,
  "longitude": 77.209
}
```

Update a record:

```http
POST /exec?action=products
Content-Type: application/json

{
  "method": "update",
  "id": "PRODUCT_ID",
  "price": 110,
  "status": "active"
}
```

Delete a record:

```http
POST /exec?action=products
Content-Type: application/json

{
  "method": "delete",
  "id": "PRODUCT_ID"
}
```

## GPS Radius

Supported radius options are `1`, `5`, `10`, `25`, `51`, `100`, and `all`.

Example:

```http
GET /exec?action=search&q=milk&latitude=28.6139&longitude=77.209&radius=5
```

## Authentication

Register:

```http
POST /exec?action=register
Content-Type: application/json

{
  "name": "Asha Sharma",
  "phone": "9999999999",
  "email": "asha@example.com",
  "password": "strong-password",
  "city": "Delhi",
  "state": "Delhi"
}
```

Login:

```http
POST /exec?action=login
Content-Type: application/json

{
  "phone": "9999999999",
  "password": "strong-password"
}
```

## Sheets

The backend automatically creates and maintains these tabs:

- Products
- Properties
- News
- Businesses
- Advertisements
- Users
- Wallet
- Orders
- PromotionCampaigns
- Media
- AppSettings
- ActivityLogs