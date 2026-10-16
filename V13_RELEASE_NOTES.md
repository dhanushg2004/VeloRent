# VeloRent V13 — Fleet Showroom

## New in V13
- Vehicle inventory can switch between Gallery and Table views.
- Gallery cards show vehicle type, make/model, registration, daily rental rate, and status.
- Added vehicle summary metrics: registered fleet, available, rented, and combined daily rate value.
- Added vehicle-type filter alongside existing text search and status filter.
- Edit and delete actions work from both Gallery and Table views and use the existing app handlers.
- Responsive layout for desktop/tablet/mobile and reduced-motion support.

## Data and integration
- Reuses the existing `data.vehicles` records and current edit/delete flows.
- No Apps Script or Google Sheets schema changes required.
- The card illustrations use local emoji-style category icons, not photos of the exact registered vehicle.
- Existing backend and Netlify API proxy are retained. Test add/edit/delete and remote sync after deploying.
