# On-Premises SMS Gateway Activation & Verification Guide

This guide outlines the quick verification and activation checklist for the Ministry of Agriculture on-premises SMS Gateway (`172.16.166.186`).

---

## 1. Network Prerequisite (MoA Intranet / SMS VPN)
- **Target Gateway IP**: `172.16.166.186`
- **Subnet**: Private internal network (`172.16.0.0/12`).
- **Connection**: Your workstation or deployment server must be connected to the **Ministry Office LAN/Wi-Fi** or the **MoA SMS VPN** tunnel.

### Quick Reachability Check (PowerShell / Terminal):
```powershell
ping 172.16.166.186
```
*(Must reply with `Reply from 172.16.166.186: bytes=32 time<10ms` before proceeding).*

---

## 2. Gateway Information to Confirm with IT / Telecom Admin
Confirm the following 3 items with the network/gateway administrator:
1. **Listening Port**: (e.g. `8080`, `80`, `5000`)
2. **HTTP Endpoint Path**:
   - Common default: `http://172.16.166.186:8080/` or `http://172.16.166.186:8080/v1/sms/send`
3. **Authentication Header**:
   - **None**: If local IP is whitelisted without authentication.
   - **Bearer Token**: `Authorization: Bearer <API_KEY>`
   - **Raw Token**: `Authorization: <API_KEY>` (common with Android Traccar / SMS Gateway apps).
4. **Payload Expectation**:
   - Our system currently dispatches JSON:
     ```json
     {
       "to": "+251911234567",
       "message": "[MoA Alert] High-Value Disbursement..."
     }
     ```

---

## 3. Web Portal Activation Steps

1. Log in to the **Procurement Tracking System** (`http://localhost:3000` or production URL) as **Admin** or **Finance Officer**.
2. Go to **Finance** ➔ **Settings** (or the SMS Gateway configuration tab).
3. Configure the fields:
   - **SMS Alerts Enabled**: `ON`
   - **Mock Mode**: Switch to **`OFF`** (disables simulation and engages real HTTP dispatch).
   - **Gateway URL**: `http://172.16.166.186:<PORT>/<PATH>` (e.g., `http://172.16.166.186:8080/`)
   - **Auth Format**: Select `BEARER` or `RAW` (matches your gateway configuration).
   - **Gateway API Key**: Enter the secret key / token.
   - **High-Value Threshold**: e.g., `500,000` ETB (disbursements exceeding this trigger alerts).
   - **Recipient Numbers**: Add designated senior official phone numbers (e.g., `+251911234567`).
4. Click **"Save Settings"**.

---

## 4. Live Test Procedure
1. On the same settings page, locate the **"Test SMS Connectivity"** card.
2. Enter your test mobile number (`+2519...`).
3. Click **"Send Test SMS"**.
4. **Verification**:
   - **On Phone**: You will receive:  
     `[MoA Test] SMS gateway connectivity check from Procurement System.`
   - **On Screen**: The portal displays a green status badge: `HTTP 200 OK`.
   - **In Database**: Check `SmsLog` table; record will have `status = 'SENT'`.

---

## 5. Troubleshooting
| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| `fetch failed (ETIMEDOUT / ENETUNREACH)` | Machine not on MoA network or VPN | Reconnect to MoA LAN or start the SMS VPN client. |
| `HTTP 401 / 403 Unauthorized` | Wrong API key or auth format | Switch auth format between `BEARER` and `RAW` in portal settings. |
| `HTTP 404 Not Found` | Incorrect URL path | Confirm exact path (e.g., add `/v1/sms/send` or trailing slash `/`). |
