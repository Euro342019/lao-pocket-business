# Lao Pocket Business

A simple, private personal income and expense tracker for people in Laos.
Record income and expenses in Lao Kip (₭), see where your money goes, and keep
your data on your own device.

- **Languages:** Lao (default), Thai, English
- **Currency:** Lao Kip (LAK), whole Kip only
- **Works on:** phones, tablets and desktop browsers
- **Cost:** free and open source. No server, no account, no paid services

---

## Features

| Area | What it does |
| --- | --- |
| Overview | Total income, total expenses, net cash flow and number of transactions for **Today / This week / This month / a custom date range**; recent transactions; expenses by category; daily expenses chart |
| Transactions | Add, view, edit and delete (with confirmation) income and expense records; search notes; filter by date, type and category; totals for the filtered list |
| Categories | 4 income and 9 expense categories, translated into Lao, Thai and English |
| Data | Saved automatically in the browser; export to CSV; download a full JSON backup; restore from a backup (merge or replace, always with confirmation); delete all data |
| Look & feel | Light and dark themes; mobile-first layout with a bottom menu and a large "Add" button; desktop layout with the menu in the header |

**Net cash flow** is income minus expenses *recorded in the selected period*.
It is **not** a bank balance or verified available cash.

## Getting started

Requirements: [Node.js](https://nodejs.org/) 22.12 or newer (the LTS version is fine) and npm.

```bash
npm install        # install dependencies
npm run dev        # start the development server → http://localhost:5173
```

Open the address shown in the terminal. To try it on your phone, connect it to
the same Wi-Fi and run `npm run dev -- --host`, then open the "Network"
address shown. (Some browsers restrict storage on plain-`http` network
addresses. Use the production build on an `https` host for real use.)

### Production build

```bash
npm run build      # type-check and build into dist/
npm run preview    # serve the built app → http://localhost:4173
```

`dist/` is a static website. You can host it on any free static host (GitHub
Pages, Netlify, Cloudflare Pages) or open it from a local web server. It uses
relative paths, so it also works from a sub-folder.

## Tests

```bash
npm test           # unit + component tests (Vitest + React Testing Library)
npm run typecheck  # TypeScript only
```

Browser tests (Playwright) run against the production build at a phone size
(Pixel 7) and a desktop size (1280 px):

```bash
npm run build
npx playwright install chromium   # first time only
npm run test:e2e
```

If Chromium is already installed elsewhere, point to it instead:
`PW_CHROMIUM_PATH=/path/to/chromium npm run test:e2e`.

What is covered:

- Adding income and expenses, editing, deleting with confirmation, viewing details
- Income / expense / net cash-flow totals, category totals, daily totals
- Today / week / month / custom period ranges (including month and year boundaries)
- Search and filters by date, type and category
- Amount parsing and validation (zero, negative, decimals, text, `Infinity`, too large; Lao and Thai digits)
- Kip formatting and date formatting in all three languages
- Persistence after reload, corrupt stored data, unavailable storage, full storage
- CSV export (escaping and formula-injection protection), JSON backup round trip, import validation, merge without overwriting
- Every language has every text, with matching placeholders
- Language switching, theme switching and persistence of both
- Double-submit protection
- No network requests (component test plus browser check), no horizontal scrolling on phone and desktop, touch-target size, Content-Security-Policy present

## Privacy and your data

**Where is my data?** Only in this browser on this device (`localStorage`).
The app has no server and no account, and runs no analytics or tracking. It
never sends your transactions anywhere, including to any AI service.

The production build includes a Content-Security-Policy with
`connect-src 'none'`. The browser itself blocks the page from making network
requests, so data cannot leave by accident.

**Important limitations: please read**

- **Browser storage is not encrypted.** Anyone who can use this device and
  browser profile can open the app and see your records. Treat it as a
  personal notebook, not a secure vault.
- **Data can be lost.** These all permanently delete your records:
  clearing browser data or site data, uninstalling the browser, some
  "cleaner" apps, private/incognito windows (data is gone when the window
  closes), or losing or resetting the device. The app asks the browser to keep
  its storage persistent, but browsers do not guarantee this.
- **Each browser is separate.** Data in Chrome is not visible in Firefox, and
  data on your phone is not on your computer. There is no sync.
- **Several tabs:** changes in one tab update other open tabs of the app.

**Backups (strongly recommended)**

1. Go to **Settings → Export & backup → Download backup (JSON)** regularly,
   for example once a week.
2. Keep the file somewhere safe (e.g. your own cloud drive or a USB stick).
   The backup file is plain, unencrypted text, so protect it like any
   financial document.
3. To restore, use **Restore from backup**. The file is checked first. If any
   record is invalid, nothing is imported. You then choose:
   - **Add to my data:** adds new records and skips ones you already have.
     Existing records are never changed.
   - **Replace all my data:** asks for a second confirmation, then replaces
     everything.

**CSV export** opens in Excel, Google Sheets or LibreOffice. It is for viewing
and analysis. Use the JSON backup to restore data.

**Deleting everything:** **Settings → Delete data → Delete all data** removes
all transactions and settings stored by this app, after confirmation.

## Project structure

```
src/
  app/            App shell, navigation, dialogs; language & theme preferences
  components/     Reusable UI: Modal, ConfirmDialog, Toast, Icon, EmptyState
  features/
    categories/   Category list (ids, colours, translation keys)
    dashboard/    Overview: period selector, summary cards, charts
    transactions/ Form, list, details, filters page, calculations, validation
    settings/     Language/theme, export, backup/restore, delete all
  hooks/          useTransactions: state + automatic saving
  i18n/           All interface text (lo / th / en) and month names
  services/
    storage/      localStorage wrapper with error handling and validation
    export/       CSV, JSON backup (create/validate/merge), file download
  styles/         Design tokens (CSS variables) and global styles
  types/          Transaction types
  utils/          Money parsing/formatting, date ranges/formatting
  tests/          Test setup and fixtures (sample data lives only here)
e2e/              Playwright browser tests
```

### Design decisions

- **Money is stored as integers of whole Kip.** All sums are exact integer
  additions with no floating-point rounding. Formatting (`1,500,000 ₭`) happens
  only on screen and is kept separate from calculations. Amounts use the same
  comma grouping in every language, because browsers disagree on Lao number
  formatting.
- **Dates are stored as local calendar dates** (`YYYY-MM-DD`), so a record
  never moves to another day because of time zones. Weeks start on Monday.
  Dates always show Gregorian years (matching the date picker), with Lao, Thai
  or English month names bundled in the app.
- **Stored values never depend on the language.** Transactions keep
  `categoryId: "food"` and `type: "expense"`. Labels are looked up when
  displayed.
- **All stored and imported data is validated** before use. Unknown fields
  are dropped. Bad records are skipped (from storage) or the whole file is
  rejected (on import). Unreadable stored data is copied to
  `lpb.v1.transactions.corrupt` instead of being destroyed.
- **No runtime dependencies besides React.** No chart library (charts are
  plain CSS), no icon font, no web fonts downloaded from the internet.

### Adding a category

1. Add an entry to `src/features/categories/categories.ts` with a new, stable `id`.
2. Add its label key to **all three** languages in `src/i18n/translations.ts`.
   TypeScript and the translation tests fail if one is missing.

### Adding or changing text

All text is in `src/i18n/translations.ts`. English defines the keys; Lao and
Thai must have exactly the same keys. Run `npm test` to check.

## Known limitations

- Data lives in one browser on one device. There is no sync or account.
- Browser storage is not encrypted. There is no app PIN or lock.
- Only Lao Kip, no foreign currencies or exchange rates.
- Categories are fixed (no custom categories yet).
- No CSV import (JSON backup restore is supported).
- No recurring transactions, budgets or reminders.
- The app is not yet installable or offline-capable as a PWA. After the
  first load it needs the web server to open again.
- The look of the date picker (e.g. `mm/dd/yyyy`) comes from the browser and
  device language, not from the app's language setting.
- Lao and Thai translations were written for this MVP and should be reviewed
  by native speakers with real users.

## Suggested next milestone

**"Use it every day, offline":** make the app an installable Progressive Web
App (home-screen icon, works without internet), add a weekly backup reminder,
and run a short usability test with 5–10 real users in Laos to refine wording,
categories and the add-transaction flow. After that, consider custom
categories and simple monthly budgets.
