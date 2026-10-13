# Lao Pocket Business

A simple, private personal income and expense tracker for people in Laos.
Record income and expenses in Lao Kip (₭), see where your money goes, and keep
your data on your own device.

- **Languages:** Lao (default), Thai, English
- **Currency:** Lao Kip (LAK), whole Kip only
- **Works on:** phones, tablets and desktop browsers. Installable as an app and usable offline
- **Cost:** free and open source. No server, no account, no paid services

---

## Features

| Area | What it does |
| --- | --- |
| Overview | Total income, total expenses, net cash flow and number of transactions for **Today / This week / This month / a custom date range**; recent transactions; expenses by category; daily expenses chart |
| Transactions | Add, view, edit and delete (with confirmation) income and expense records; search notes; filter by date, type and category; totals for the filtered list |
| Categories | 4 income and 9 expense categories, translated into Lao, Thai and English |
| Data | Saved automatically in the browser; export to CSV; download a full JSON backup; restore from a backup (merge or replace, always with confirmation); delete all data |
| Backup reminder | A gentle weekly reminder on the Overview to download a JSON backup, with "Download backup", "I already have a backup" and "Remind me later" |
| App & offline | Installable Progressive Web App (home-screen icon, own window); opens without internet after the first visit; online/offline indicator; "new version available" prompt |
| Look & feel | Light and dark themes; mobile-first layout with a bottom menu and a large "Add" button; desktop layout with the menu in the header |

**Net cash flow** is income minus expenses *recorded in the selected period*.
It is **not** a bank balance or verified available cash.

## Getting started

Requirements: [Node.js](https://nodejs.org/) **22.12 or newer within Node 22** and npm.
On **macOS Big Sur (11)** use Node 22: Node 22 supports macOS 11 and later, but Node 24
and newer need macOS 13.5 or later (see Node's `BUILDING.md`). Check with `node -v`.

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

## Install the app and use it offline

Lao Pocket Business is a **Progressive Web App (PWA)**. You can install it like
a normal app, and after the first visit it opens without internet.

### Requirements

- Use the **production build** on an **`https://` address** (any static host)
  or on `http://localhost`. Browsers only allow installing and offline use on
  secure addresses. `npm run dev` does not enable offline mode.
- Open the app **once with internet**. It then saves its own files (not your
  data) for offline use. **Settings → Offline use & install** shows
  "Ready: the app opens without internet" when this is done.

### How to install

| Device / browser | Steps |
| --- | --- |
| Android: Chrome (also Edge, Samsung Internet) | Open the app → **⋮ menu → Install app** (or **Add to Home screen**). Chrome may also show an install banner. In Chrome you can tap **Settings → Install app** inside Lao Pocket Business. |
| iPhone / iPad: Safari | Open the app in **Safari** → tap **Share** → **Add to Home Screen** → **Add**. (On iOS 16.4+ this also works from Chrome and Edge via Share.) |
| Windows / macOS / Linux: Chrome or Edge | Click the **install icon** at the right of the address bar, or **menu → Install Lao Pocket Business** (Edge: **Apps → Install this site as an app**). The **Install app** button in Settings also works. |
| macOS: Safari 17+ | **File → Add to Dock**. |
| Firefox (desktop) | Firefox desktop does not install web apps. Use it in a normal tab; offline mode still works there. Firefox on Android: **⋮ → Install**. |

To uninstall, remove it like any other app (long-press the icon, or in a
desktop browser open the app's menu → **Uninstall**). On Android and
desktop, uninstalling may also delete the app's stored data. **Download a
backup first.**

### Offline access is not sync

- **Offline access** means the app *itself* (its screens and code) is stored
  by the browser, so it opens and works with no internet. You can view, add,
  edit and delete transactions offline as usual.
- **There is no synchronisation.** Your transactions are stored only on this
  device, in this browser's storage. They are never uploaded, online or
  offline. Another phone or computer will not see them. To move data, use
  **Settings → Download backup (JSON)** and **Restore from backup**.
- The header shows **Online / Offline**. When offline, a message explains that
  new entries are saved on this device only.
- **iPhone/iPad:** the Home Screen app has **its own separate storage**, not
  shared with Safari. Records you entered in Safari are not visible in the
  installed app. Download a backup in Safari and restore it in the installed
  app.
- On Android and desktop Chrome/Edge, the installed app and the browser tab
  share the same data.

### What the service worker does (and does not do)

The service worker is generated by
[vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (Workbox). It
**precaches only the static app files** built into `dist/` (HTML, JavaScript,
CSS, icons, manifest) and answers page loads with the cached `index.html`.
It has **no runtime caching rules**, makes no requests of its own, and never
reads or stores transactions. The app has no API, and transactions stay in
`localStorage`. The Content-Security-Policy still blocks all network
requests from the page (`connect-src 'none'`).

**Updates (how it really works):**

- The browser checks for a new version **when the app is opened or
  reloaded while online**. There is no timer that checks while the app
  stays open, and no update is ever installed by the app on its own.
- A new version downloads in the background and waits. A bar says
  **"A new version of the app is ready" → Update now**.
- **Nothing changes until you tap Update now.** Then only that tab reloads
  with the new version. Other open tabs of the app are **not** reloaded
  (a half-filled form there is kept); they show "The app was updated in
  another tab… Reload now" so you can reload when you are ready.
- If you never tap it, the old version keeps running. Browsers may switch
  to the waiting version on their own once **every** window and tab of the
  app has been closed (this is standard browser behaviour, not an app
  feature). In our Chromium test, closing the only tab and reopening it a
  moment later still showed the "Update now" bar.

### Regenerating the icons

Icons are in `public/` and are generated from an SVG with:

```bash
node scripts/generate-icons.mjs   # uses Playwright's Chromium (or PW_CHROMIUM_PATH)
```

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
- Data safety (audit H1–H5): no success message after a failed save, edit, delete, merge or restore; read-only mode for unreadable or newer-version data; records set aside and restored without loss (including when either write fails); "Delete all data" when `removeItem` fails on any key or silently does nothing; several tabs via `StorageEvent` with fake timers (newer data from another tab, unknown records, a failed save while another tab writes)
- CSV formula injection: `= + - @` and full-width forms, directly and after spaces, tabs, CR/LF, no-break, zero-width, BOM, NUL/other control characters; original data unchanged
- Amount limits: per-transaction `MAX_AMOUNT` and the total limit on calculation, add, edit, delete, merge, restore, backup import and CSV/JSON export (exact BigInt comparison)
- Midnight with fake timers in Asia/Vientiane: "Today", week (Sunday→Monday) and month/year (31 Dec→1 Jan) roll over while the app is open; wake-up re-check; local vs UTC date
- App updates with two real versions (Chromium): "Update now" offered, nothing activated without consent, only the tapping tab reloads, other tabs keep their typed input
- CSV export (escaping and formula-injection protection), JSON backup round trip, import validation, merge without overwriting
- Every language has every text, with matching placeholders
- Language switching, theme switching and persistence of both
- Double-submit protection
- No network requests (component test plus browser check), no horizontal scrolling on phone and desktop, touch-target size, Content-Security-Policy present
- PWA: manifest fields, icon files and their real pixel sizes, Apple touch icon, theme colour; Chromium's own installability check (`Page.getInstallabilityErrors` returns no errors); manifest and icons served correctly
- Service worker: precache list contains only static app files, a single navigation route, no runtime caching strategies
- Offline (real browser, network switched off): reload is served by the service worker; saved transactions are shown; a new transaction can be added offline and survives another offline reload; a new tab opened offline works; the indicator and offline message appear and disappear
- Backup reminder: due after 7 days without a backup (never on day one, never without data); "Download backup" creates a real JSON file (checked in the browser) and records the time; "I already have a backup" never claims a backup; "Remind me later" hides it for the session and snoozes for a day; never appears mid-session or as a dialog; does not take focus from the transaction form; translated; reset by "Delete all data"
- Online/offline indicator, offline banner, "ready offline" message (shown once), update prompt, install button and install instructions (component tests, all three languages checked by the translation tests)

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

**Weekly backup reminder**

- When you have transactions and **no backup has been downloaded for 7 days**,
  a card at the top of the **Overview** suggests downloading one. A new user
  is first reminded 7 days after starting.
- **Download backup** downloads the JSON backup file immediately (the same as
  Settings → Download backup). The app records "last backup downloaded" only
  when it actually starts this download. CSV export does not count.
- **I already have a backup** hides the reminder for 7 days. This is your
  own statement and is shown as "You marked a backup as done", never as a
  backup the app made.
- **Remind me later** hides it for the rest of this session and for 1 day.
- It is never a pop-up or notification. It does not take focus and only
  appears when the app opens, never in the middle of entering a transaction.
  Once hidden, it does not come back in the same session.
- It works entirely in the browser (no server, no push notifications). It
  can only remind you when you open the app. Its state is stored in
  `lpb.v1.backupReminder` and removed by "Delete all data".
- **Settings → Export & backup** always shows when the last backup was
  downloaded from this device.

Note: the browser cannot tell the app whether you kept the downloaded file.
"Last backup downloaded" means the download was started. Check your
Downloads folder and move the file somewhere safe.

**CSV export** opens in Excel, Google Sheets or LibreOffice. It is for viewing
and analysis. Use the JSON backup to restore data. To prevent spreadsheet
formula injection, any text that could start a formula (`=`, `+`, `-`, `@`, or
their full-width forms `＝ ＋ － ＠`, also when preceded by spaces, tabs, line
breaks, zero-width or other control characters, and any text starting with a
tab or carriage return) gets an apostrophe `'` in front **in the CSV file
only**. Your stored data and the JSON backup keep the original text.

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
    offline/      Online/offline indicator, offline & update banners, install section
    backupReminder/ Weekly backup reminder: rules, local state, card
  hooks/          useTransactions (state + automatic saving), useOnlineStatus
  i18n/           All interface text (lo / th / en) and month names
  pwa/            Web app manifest, service-worker registration, PWA state store
  services/
    storage/      localStorage wrapper with error handling and validation
    export/       CSV, JSON backup (create/validate/merge), file download
  styles/         Design tokens (CSS variables) and global styles
  types/          Transaction types
  utils/          Money parsing/formatting, date ranges/formatting
  tests/          Test setup and fixtures (sample data lives only here)
e2e/              Playwright browser tests (app flows, PWA install & offline)
public/           Favicon and PWA icons
scripts/          generate-icons.mjs
```

### Design decisions

- **Money is stored as integers of whole Kip.** Formatting (`1,500,000 ₭`)
  happens only on screen and is kept separate from calculations. Amounts use
  the same comma grouping in every language, because browsers disagree on Lao
  number formatting.
- **Safe amount limits (every total stays exact).** One transaction can be at
  most **999,999,999,999,999 ₭**. Total income and total expenses (each, over
  all records) can be at most **9,007,199,254,740,991 ₭**, the largest integer
  JavaScript adds without rounding. Within these limits every total (any
  period, category, day, filter and the net) is exact. A new entry, an edit,
  a merge or an imported backup that would go past the limit is **refused with
  a message**; nothing is rounded silently. Data from an older version that
  is already over the limit is left unchanged but flagged ("totals may be
  rounded"), and deleting the mistaken amounts is always allowed. Exports
  contain every amount exactly.
- **Dates are stored as local calendar dates** (`YYYY-MM-DD`), so a record
  never moves to another day because of time zones. Weeks start on Monday.
  Dates always show Gregorian years (matching the date picker), with Lao, Thai
  or English month names bundled in the app. "Today", "This week" and "This
  month" follow the device's local date and switch at local midnight, also
  when the app stays open (re-checked when the page becomes visible again,
  because phones pause timers while asleep). Tested in Asia/Vientiane.
- **Stored values never depend on the language.** Transactions keep
  `categoryId: "food"` and `type: "expense"`. Labels are looked up when
  displayed.
- **All stored and imported data is validated** before use. Unknown fields
  are dropped. On import, the whole file is rejected if any record is invalid.
- **Saving is "save first, then show".** Every change is written to storage
  first. The screen only changes, and a success message only appears, when
  that write succeeded. If saving fails (for example, storage is full), the
  form stays open with what you typed and an error is shown; deletes and
  imports show an error. A failed change never alters stored data.
- **Unreadable data is never overwritten.** If the stored data cannot be read
  (damaged, or saved by a newer app version), the app switches to a
  **read-only mode**: adding, editing and importing are paused, and a warning
  offers **Download unreadable data** (the exact stored text) and
  **Start fresh** (deletes it, only after confirmation).
- **Unreadable records are set aside, not dropped.** Single records this
  version cannot read (for example, a category added by a newer version) are
  first copied to `lpb.v1.transactions.unreadable`, and only then removed
  from the main list. A notice shows how many there are, with a download
  button. When a version that understands them opens the data, they are
  restored automatically. If they cannot be set aside (storage full), the
  app stays read-only instead of risking them.
- **"Delete all data" is verified.** Each key is removed separately (one
  failure does not stop the others) and read back. Success is only reported
  when nothing is left; otherwise an error is shown.
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
- Offline mode needs one visit with internet first, on `https://` or
  `localhost`. A page never opened online cannot open offline (this is tested).
- Install and offline behaviour were tested automatically in **Chromium**
  only. Safari (iOS/macOS) and Firefox were not tested by machine. Please
  check "Add to Home Screen" and airplane mode on a real iPhone and Android
  phone before relying on it.
- The backup reminder only appears when the app is opened (no background
  notifications). Someone who never opens the app is never reminded.
- "Last backup downloaded" means the download was started; the browser cannot
  confirm the file was saved or kept.
- The update flow is tested with two real versions in Chromium only (not
  Safari/iOS or Firefox). An app left open for days only sees a new version
  after it is reloaded or reopened.
- On iPhone/iPad, the installed app and Safari keep separate data, and iOS may
  delete data of web apps that are not used for several weeks. Keep backups.
- The look of the date picker (e.g. `mm/dd/yyyy`) comes from the browser and
  device language, not from the app's language setting.
- Lao and Thai translations were written for this MVP and should be reviewed
  by native speakers with real users.

## Suggested next milestone

**"Real-world pilot":** deploy the build to a free HTTPS host, check install
and airplane-mode use on real Android phones and iPhones, and run a short usability test with 5–10 real users in Laos
to refine wording, categories and the add-transaction flow. After that,
consider custom categories and simple monthly budgets.
