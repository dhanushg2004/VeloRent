# VeloRent V15 — Node.js edition

This project runs the VeloRent website with a Node.js + Express server. The server exposes `/api` and securely forwards app actions to your existing Google Apps Script web app. Google Sheets remains the database through Apps Script, so no Sheet schema migration is needed for this edition.

## Requirements
- Node.js 20 or newer
- Your current deployed Google Apps Script Web App URL ending in `/exec`

## Run locally
1. Extract this folder and open it in VS Code.
2. Open Terminal in this folder.
3. Run `npm install`.
4. Copy `.env.example` to a new file named `.env`.
5. Edit `.env` and replace `GAS_WEB_APP_URL` with your current deployed Apps Script URL.
6. Run `npm start`.
7. Open `http://localhost:3000`.
8. Test login, vehicle list, and one booking. Check the Google Sheet to confirm changes.

## Deployment
Deploy this folder to a Node.js host that supports persistent Express servers, such as Render, Railway, or a VPS. Set `GAS_WEB_APP_URL` in the host's environment-variable settings. Netlify static hosting alone does not run `server.mjs`; use a Node-capable host or convert the server into platform-specific functions.

## Important
- This edition uses Node.js as the web server/API proxy, but Google Apps Script still performs authenticated spreadsheet operations. It is designed to preserve the current working backend and avoid breaking the existing Sheet setup.
- Do not put passwords or service-account keys in frontend files. Never publish `.env`.
- The current Apps Script code and existing Netlify function are retained for reference/rollback.
- Run a live login and read/write test after deployment; syntax checks cannot prove the hosted credentials and permissions are correct.
