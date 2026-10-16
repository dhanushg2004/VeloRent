# VeloRent Google Sheets setup

1. Open your spreadsheet and select **Extensions → Apps Script**.
2. Replace the editor contents with `Code.gs` from this ZIP.
3. Save, select `setupVeloRentSheets` from the function dropdown and click **Run**.
4. Authorize the script. Verify tabs: `Vehicles`, `Bookings`, `Payments`, `Settings`.
5. Click **Deploy → Manage deployments → Edit** (pencil icon).
6. Select **New version**, then **Deploy**. Keep using the same web app URL where possible.
7. Test the URL in a browser:
   - append `?action=health` and confirm the JSON message
   - append `?action=getState` and confirm `state.vehicles` and `state.bookings`
8. In VS Code open the extracted folder and launch `index.html` with Live Server.
9. Log in with `admin` / `admin123`. Make a test change and verify it appears in the sheet.

If the deployment URL changes, update `API_URL` at the top of `script.js`.

**Important:** The current prototype's admin login is client-side, and its write endpoint is not protected by real server-side authentication. Do not use with real customer data or expose publicly until access control is added.


## Pro upgrade checks

1. Open `index.html` in VS Code and deploy the frontend to Netlify.
2. The existing Apps Script endpoint is retained in `script.js`. Check the connection badge after sign-in.
3. Run a test booking using a vehicle and test dates. A second active booking for the same vehicle with overlapping dates should be blocked.
4. Rental duration uses nights (return date minus pickup date; minimum 1 day).
5. The frontend's admin login is a starter-only UI gate. For production, implement server-side authentication and access control before storing real customer information.


## Real authentication (required for this edition)
Follow `SETUP_REAL_LOGIN.md` instead of the earlier demo-login steps. This edition does not accept the old `admin / admin123` browser-only login.
