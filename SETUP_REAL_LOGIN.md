# VeloRent — Real Login & Role Access Setup

This build replaces the browser-only `admin/admin123` check with backend-verified login. Password hashes are stored in the Google Sheet `Users` tab; sessions are random tokens held in Apps Script cache; protected API actions check the role server-side. Netlify Function is a same-origin proxy so the browser can read the API response.

## Access levels

- **SUPER_ADMIN** — full system access and user account administration.
- **ADMIN** — fleet, bookings, customers, cash and reports.
- **MANAGER** — fleet, bookings, customers and reports.
- **ACCOUNTANT** — dashboard, customers, cash and reports.
- **STAFF** — dashboard, fleet, bookings and customers.
- **VIEWER** — read-only areas (UI gates; backend write actions are denied).

The first Super Admin is created only by the one-time bootstrap function. Do not add a `SUPER_ADMIN` account through the user form.

## A. Google Sheets / Apps Script

1. Make a backup copy of the existing rental spreadsheet.
2. Open the spreadsheet → **Extensions → Apps Script**.
3. Replace `Code.gs` with this package's `Code.gs`, save.
4. Run `setupVeloRentSheets()` once and approve Google permissions.
5. In Apps Script **Project Settings → Script Properties**, add:
   - `INITIAL_ADMIN_USERNAME` = a username of your choice (4+ characters)
   - `INITIAL_ADMIN_PASSWORD` = a unique password of at least 14 characters
6. Run `bootstrapSuperAdmin()` once. It removes the two initial credential properties after creating the account. Never put a real password into source code.
7. Deploy → **Manage deployments** → Edit the Web App deployment → **New version** → Deploy. Set **Execute as: Me**. Set access to **Anyone** so Netlify can call the endpoint; API actions other than health require a valid session token. This endpoint is not safe to share with untrusted parties unless you have completed testing.
8. Your supplied Apps Script URL is configured as the Netlify Function default: `https://script.google.com/macros/s/AKfycbwWcbP5yzVDKqBX4fNwFHkBXoWtanSSFQOUGMCfvRsYjlxOz8y8auS1fV_0dpELU17O/exec`. You can override it by setting `GAS_WEB_APP_URL` in Netlify.

## B. Netlify proxy configuration

1. Deploy this extracted folder as the Netlify site (the `netlify/functions/api.mjs` and `netlify.toml` files must be included).
2. Netlify dashboard → **Site configuration → Environment variables**.
3. Add `GAS_WEB_APP_URL` with the Apps Script `/exec` URL.
4. Trigger a new deploy.
5. Open the site and sign in using the one-time Super Admin credentials you configured. Create named accounts for staff in **User access**.

## C. Important migration warning

The `Users` tab is added. Existing `Vehicles`, `Bookings`, `Payments`, and `Settings` tabs must keep the headers expected in `Code.gs`. Back up the spreadsheet before deploying. The previous client-only `admin/admin123` login is no longer accepted.

## Security notes

- This is a substantial improvement over a client-only password check, but it is not a formal security audit.
- Use unique long passwords and do not share Super Admin credentials.
- Apps Script cache sessions expire after six hours; sign in again after expiry.
- Password changes, MFA, audit trail, rate limiting, and account recovery are not implemented in this starter.
- The role-based navigation is a usability gate; the backend separately protects state writes, user management, and payment writes. Review additional endpoints before adding them.
- The current state save writes the complete Vehicles and Bookings tables. Only one trusted operator should edit at a time until row-level updates and conflict resolution are implemented.


## 3D visual edition
This final package adds subtle perspective depth, animated gold headline shimmer, floating dashboard accents, card hover tilt, and button feedback. Animations respect the device's reduced-motion accessibility setting.
