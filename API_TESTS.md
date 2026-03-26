# Vaayu API Quick Tests

## Start API

```bash
npm run start:api
```

Default base URL: `http://localhost:3000`

## 1) Register user

```bash
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@vaayu.app","password":"demo1234","fullName":"Demo User"}'
```

## 2) Login user

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@vaayu.app","password":"demo1234"}'
```

Copy the `token` value into `TOKEN` below:

```bash
TOKEN="PASTE_JWT_TOKEN_HERE"
```

## 3) Add emergency contact (protected)

```bash
curl -s -X POST http://localhost:3000/api/contacts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","phone":"+15555550123"}'
```

## 4) List emergency contacts (protected)

```bash
curl -s http://localhost:3000/api/contacts \
  -H "Authorization: Bearer $TOKEN"
```

## 5) Trigger SOS (protected + socket broadcast + optional SMS)

```bash
curl -s -X POST http://localhost:3000/api/sos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lat":19.0760,"lon":72.8777,"message":"Help needed immediately"}'
```

## 6) Fetch anomalies

```bash
curl -s "http://localhost:3000/api/anomalies"
```

### With filters and pagination

```bash
curl -s "http://localhost:3000/api/anomalies?severity=critical&page=1&pageSize=20"
```

```bash
curl -s "http://localhost:3000/api/anomalies?from=2026-03-20T00:00:00Z&to=2026-03-26T23:59:59Z&page=1&pageSize=50"
```

## 7) Fetch 7-day weather history nearest to lat/lon

```bash
curl -s "http://localhost:3000/api/weather/19.0760/72.8777"
```

## Optional Twilio SMS setup

Set these in `.env` to enable SMS sends during SOS:

```env
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...
```

Without these variables, SOS still works and broadcasts over Socket.IO.
