# Manual testing on real devices

Automated tests run in Chromium only. Before a release, check these by hand.
Use **made-up test data only** (never real financial records), and a fresh
browser profile or a test device.

Deploy a test build to an HTTPS host first (for example a Netlify or
Cloudflare Pages preview URL). Offline use and installation need HTTPS.

## 1. iPhone / iPad – Safari (iOS 16.4 or newer)

1. Open the test URL in **Safari** with internet. Switch the language to
   English in the header (to compare with this list), then back to Lao.
2. Add an income (e.g. 5,000,000) and two expenses. Check the totals,
   "Today / This week / This month", and that the amount field shows the
   numeric keyboard.
3. Type `1.500` as an amount: the preview shows **1,500 ₭** and a note says
   the dot was read as a thousands separator.
4. Settings → **Download backup (JSON)**. Check the file appears in the
   Files app (Downloads) and opens as text. Then **Export CSV**.
5. Share → **Add to Home Screen** → open the new icon. The app opens in its
   own window. **Note:** it starts empty (iOS keeps Home Screen apps'
   data separate from Safari). Restore the backup from step 4 and check the
   totals match.
6. In the installed app: turn on **Airplane Mode**, close the app fully
   (swipe up), reopen it. It must open, show "Offline", and keep the data.
   Add a transaction offline, close and reopen: it is still there.
7. Leave the app open across midnight (or change the device clock to 23:59,
   wait, and return to the app): "Today" must show the new day.
8. Repeat step 4 **inside the installed app** (downloading from a Home
   Screen app is the riskiest part on iOS). Note the result.
9. Settings → **Delete all data** → confirm. Reopen: no data.

Record: iOS version, device, pass/fail per step, screenshots of failures.

## 2. Android – Chrome

1. Open the test URL in Chrome with internet. Add a few transactions.
2. ⋮ menu → **Install app** (or use Settings → Install app inside Lao Pocket
   Business). Open it from the home screen.
3. Download a JSON backup and a CSV export; find them in Files → Downloads.
4. Airplane mode → close the app from recent apps → reopen: it opens,
   shows "Offline", data is there. Add a record offline, reopen, still there.
5. Updates: deploy a second build (any small change), open the app online,
   wait for **"A new version of the app is ready" → Update now**. With the
   app also open in a Chrome tab with a half-typed note, tap Update now in
   the installed app: only that window reloads; the tab keeps the note and
   shows "updated in another tab".
6. Check the security headers once (from a computer):
   `curl -sI https://<test-url>/ | grep -iE 'frame|nosniff|referrer'`.

## 3. CSV in Excel, LibreOffice Calc and Google Sheets

Create a test backup with these notes (add them as transactions, or import a
JSON backup prepared for testing) and export CSV:

| Note to enter | Expected cell content |
| --- | --- |
| `=1+1` | `'=1+1` shown as text, not `2` |
| `+1+1`, `-1+1`, `@SUM(1,1)` | shown as text starting with `'` |
| ` =1+1` (leading space) | text, not `2` |
| `＝1+1` (full-width =) | text |
| `=HYPERLINK("http://example.invalid","x")` | text, **no clickable link** |
| `Lunch, "noodles"` | one cell: `Lunch, "noodles"` |
| `ເຂົ້າປຽກ` / `ข้าวมันไก่` | Lao/Thai text displayed correctly (not `à»...`) |

Also check: amount column contains plain numbers (e.g. `999999999999999`
without `E+` notation when the column is formatted as number), dates are
`YYYY-MM-DD`, and the file has 11 columns on every row.

- **Excel (Windows/macOS):** open the `.csv` by double-click. If Lao text is
  garbled, use Data → From Text/CSV and choose UTF-8 (report it).
- **LibreOffice Calc:** open → in the import dialog choose UTF-8, separator
  comma, string delimiter `"`. Check "Evaluate formulas" is off and on (both
  must show text).
- **Google Sheets:** File → Import → Upload → "Replace spreadsheet". Check
  no cell computes a formula.

Report any cell that shows a computed value, a link, or broken characters.
