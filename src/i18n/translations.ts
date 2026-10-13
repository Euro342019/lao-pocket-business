/**
 * All interface text lives here. English defines the keys; Lao and Thai
 * must provide every key (TypeScript reports any missing one).
 * Use `{name}` placeholders for values inserted at runtime.
 */

export type Language = 'lo' | 'th' | 'en';

export const LANGUAGES: readonly { code: Language; nativeName: string; locale: string }[] = [
  { code: 'lo', nativeName: 'ລາວ', locale: 'lo-LA' },
  { code: 'th', nativeName: 'ไทย', locale: 'th-TH' },
  { code: 'en', nativeName: 'English', locale: 'en-US' },
];

export const DEFAULT_LANGUAGE: Language = 'lo';

const en = {
  'app.name': 'Lao Pocket Business',
  'app.tagline': 'Personal income & expense tracker',

  'nav.skipToContent': 'Skip to content',
  'nav.label': 'Main navigation',
  'nav.dashboard': 'Overview',
  'nav.transactions': 'Transactions',
  'nav.settings': 'Settings',

  'action.addTransaction': 'Add transaction',
  'action.save': 'Save',
  'action.cancel': 'Cancel',
  'action.edit': 'Edit',
  'action.delete': 'Delete',
  'action.close': 'Close',
  'action.clearFilters': 'Clear filters',

  'theme.label': 'Theme',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.switchToLight': 'Switch to light mode',
  'theme.switchToDark': 'Switch to dark mode',
  'language.label': 'Language',

  'type.label': 'Type',
  'type.income': 'Income',
  'type.expense': 'Expense',
  'type.all': 'All types',

  'period.label': 'Period',
  'period.today': 'Today',
  'period.week': 'This week',
  'period.month': 'This month',
  'period.custom': 'Custom',
  'period.from': 'From',
  'period.to': 'To',

  'summary.income': 'Total income',
  'summary.expense': 'Total expenses',
  'summary.net': 'Net cash flow',
  'summary.count': 'Transactions',
  'summary.netHelp': 'Net cash flow is income minus expenses recorded in this period. It is not your bank balance.',

  'dashboard.recent': 'Recent transactions',
  'dashboard.viewAll': 'View all',
  'dashboard.breakdown': 'Expenses by category',
  'dashboard.daily': 'Daily expenses',
  'dashboard.dailyTableCaption': 'Expenses per day',
  'dashboard.noExpenses': 'No expenses in this period.',
  'dashboard.noTransactionsPeriod': 'No transactions in this period.',

  'empty.title': 'No transactions yet',
  'empty.body': 'Tap “Add transaction” to record your first income or expense. Your data stays on this device.',

  'form.addTitle': 'Add transaction',
  'form.editTitle': 'Edit transaction',
  'form.amount': 'Amount (Kip)',
  'form.amountPlaceholder': 'e.g. 50,000',
  'form.category': 'Category',
  'form.date': 'Date',
  'form.description': 'Note (optional)',
  'form.descriptionPlaceholder': 'e.g. Lunch with friends',

  'error.amount.required': 'Please enter an amount.',
  'error.amount.invalid': 'Please enter a valid number.',
  'error.amount.notPositive': 'The amount must be greater than zero.',
  'error.amount.decimal': 'Kip amounts must be whole numbers.',
  'error.amount.tooLarge': 'This amount is too large.',
  'error.date': 'Please choose a valid date.',
  'error.category': 'Please choose a category.',
  'error.description': 'The note is too long (maximum {max} characters).',

  'details.title': 'Transaction details',
  'details.createdAt': 'Created',
  'details.updatedAt': 'Last edited',
  'details.noDescription': 'No note',

  'confirm.deleteTitle': 'Delete this transaction?',
  'confirm.deleteBody': 'This cannot be undone.',

  'transactions.title': 'Transactions',
  'transactions.filters': 'Filters',
  'transactions.search': 'Search notes',
  'transactions.searchPlaceholder': 'Search…',
  'transactions.allCategories': 'All categories',
  'transactions.results': '{count} transactions',
  'transactions.noResults': 'No transactions match these filters.',
  'transactions.filteredTotals': 'Totals for the transactions shown',

  'settings.title': 'Settings',
  'settings.data': 'Your data',
  'settings.recordCount': '{count} transactions stored on this device',
  'settings.privacyInfo':
    'Your transactions are stored only in this browser on this device. Nothing is uploaded, and there is no account or tracking.',
  'settings.securityInfo':
    'Browser storage is not encrypted. Anyone who can use this device and browser can see your data. Clearing browser data or losing the device will delete it, so download a backup regularly.',
  'settings.backupSection': 'Export & backup',
  'settings.exportCsv': 'Export CSV (spreadsheet)',
  'settings.exportJson': 'Download backup (JSON)',
  'settings.importJson': 'Restore from backup',
  'settings.dangerSection': 'Delete data',
  'settings.deleteAll': 'Delete all data',

  'import.title': 'Restore backup',
  'import.summary': 'This backup contains {count} transactions. You currently have {existing}.',
  'import.merge': 'Add to my data (skip duplicates)',
  'import.replace': 'Replace all my data',
  'import.replaceWarning': 'Replacing will permanently delete your current {existing} transactions.',
  'import.confirmReplaceTitle': 'Replace all data?',
  'import.merged': 'Imported {added} transactions ({skipped} already existed).',
  'import.replaced': 'Restored {count} transactions from the backup.',
  'import.error.notJson': 'This file is not a valid backup file.',
  'import.error.wrongFormat': 'This file is not a Lao Pocket Business backup.',
  'import.error.unsupportedVersion': 'This backup was made by an unsupported version of the app.',
  'import.error.invalidRecords': 'The backup contains {count} invalid records, so nothing was imported.',
  'import.error.duplicateIds': 'The backup contains duplicate records, so nothing was imported.',
  'import.error.tooLarge': 'The file is too large.',
  'import.error.totalsTooLarge':
    'The amounts in this file add up to more than the app can calculate exactly, so nothing was imported.',
  'amount.totalLimit':
    'Not saved: this would make total income or total expenses larger than the app can calculate exactly (limit {max}). Check the amount.',
  'amount.inexactTotals':
    'Your stored amounts add up to more than {max}, so totals may be rounded and are not exact. Check for amounts entered by mistake; deleting them fixes this.',
  'summary.inexact': 'These totals are too large to calculate exactly and may be rounded.',
  'import.error.readFailed': 'The file could not be read.',

  'confirm.deleteAllTitle': 'Delete all data?',
  'confirm.deleteAllBody':
    'This permanently deletes all {count} transactions and your settings from this device. Download a backup first if you may need them.',
  'confirm.deleteAllButton': 'Delete everything',

  'toast.added': 'Transaction added',
  'toast.updated': 'Transaction updated',
  'toast.deleted': 'Transaction deleted',
  'toast.allDeleted': 'All data deleted',
  'toast.downloaded': 'File downloaded',

  'storage.unavailable':
    'Browser storage is unavailable, so your data will be lost when you close this page. Download a backup before leaving.',
  'storage.saveFailed': 'Could not save: storage may be full. Nothing was changed. Download a backup and free up space, then try again.',
  'storage.saveBlocked': 'Changes are paused to protect saved data that this version cannot read (see the warning above).',
  'storage.deleteFailed': 'Could not delete the transaction: storage error. Nothing was changed.',
  'storage.importSaveFailed': 'The backup could not be saved (storage may be full). Your existing data was not changed.',
  'storage.deleteAllFailed':
    'Some data could not be deleted from this device. Try again, or clear this site’s data in your browser settings.',
  'readOnly.corrupt':
    'Saved data could not be read. To protect it, the app will not change it, so adding and editing are paused. Download it to keep a copy, or start fresh.',
  'readOnly.newerVersion':
    'Your data was saved by a newer version of this app. To protect it, adding and editing are paused. Reload the page to get the newer version, or download the data.',
  'readOnly.quarantineFailed':
    'Some saved records could not be read and there is not enough storage to set them aside safely. To protect them, changes are paused. Download the data, then free up space and reload.',
  'readOnly.download': 'Download unreadable data',
  'readOnly.startFresh': 'Start fresh',
  'readOnly.confirmTitle': 'Delete the unreadable data?',
  'readOnly.confirmBody':
    'This permanently deletes the saved data that could not be read, so you can start again with an empty list. Download it first if you may need it.',
  'readOnly.confirmButton': 'Delete and start fresh',
  'readOnly.cleared': 'Unreadable data deleted. You can add transactions again.',
  'setAside.notice':
    '{count} saved records could not be read by this version of the app. They were set aside safely in this browser and are not shown or counted.',
  'setAside.download': 'Download set-aside records',

  'footer.privacy': 'Your data stays on this device. No account. No tracking.',

  'backup.reminderTitle': 'Time to back up your data',
  'backup.reminderNever':
    'You have not downloaded a backup on this device yet. Your records exist only here, so download a backup file at least once a week.',
  'backup.reminderLast':
    'Your last backup download was {days} days ago. Download a new backup file at least once a week to keep your records safe.',
  'backup.downloadNow': 'Download backup',
  'backup.alreadyDone': 'I already have a backup',
  'backup.later': 'Remind me later',
  'backup.markedToast': 'Noted. You will be reminded again in 7 days.',
  'backup.statusNever': 'No backup has been downloaded from this device yet.',
  'backup.statusLast': 'Last backup downloaded: {date}',
  'backup.statusMarked': 'You marked a backup as done: {date}',
  'backup.weeklyTip': 'Tip: download a backup at least once a week and keep the file somewhere safe.',
  'backup.reminderLabel': 'Backup reminder',

  'connection.online': 'Online',
  'connection.offline': 'Offline',
  'connection.label': 'Connection: {status}',
  'offline.banner':
    'You are offline. The app keeps working: you can view and add transactions, and they are saved on this device. Nothing is uploaded or synced.',
  'pwa.updateAvailable': 'A new version of the app is ready.',
  'pwa.updateNow': 'Update now',
  'pwa.reloadNeeded': 'The app was updated in another tab. Finish what you are doing, then reload this page to use the new version.',
  'pwa.reloadNow': 'Reload now',
  'pwa.offlineReadyToast': 'The app is ready to use offline',
  'pwa.section': 'Offline use & install',
  'pwa.connection': 'Connection',
  'pwa.offlineAccess': 'Offline access',
  'pwa.offlineReady': 'Ready: the app opens without internet',
  'pwa.offlineNotReady': 'Not ready yet: open the app once with internet',
  'pwa.offlineUnsupported': 'Not supported by this browser',
  'pwa.noSync':
    'Offline access means the app itself opens without internet. It is not syncing: your transactions are stored only on this device and are never uploaded. Other phones or computers will not see them. To move data, use a backup file.',
  'pwa.install': 'Install app',
  'pwa.installed': 'Installed as an app on this device',
  'pwa.installHelp': 'How to install',
  'pwa.installAndroid': 'Android (Chrome): open the ⋮ menu and choose “Install app” or “Add to Home screen”.',
  'pwa.installIos': 'iPhone / iPad (Safari): tap the Share button, then “Add to Home Screen”.',
  'pwa.installDesktop': 'Computer (Chrome or Edge): click the install icon in the address bar, or open the menu and choose “Install”.',
  'pwa.installIosData':
    'On iPhone and iPad, the Home Screen app keeps its own data, separate from Safari. To move existing records, download a backup in Safari and restore it in the installed app.',

  'category.salary': 'Salary',
  'category.business': 'Business income',
  'category.allowance': 'Allowance',
  'category.otherIncome': 'Other income',
  'category.food': 'Food',
  'category.transport': 'Transport',
  'category.housing': 'Housing',
  'category.utilities': 'Utilities',
  'category.education': 'Education',
  'category.shopping': 'Shopping',
  'category.health': 'Health',
  'category.entertainment': 'Entertainment',
  'category.otherExpense': 'Other expenses',
  'category.unknown': 'Unknown category',
} as const;

export type TranslationKey = keyof typeof en;
export type Dictionary = Record<TranslationKey, string>;

const lo: Dictionary = {
  'app.name': 'Lao Pocket Business',
  'app.tagline': 'ບັນທຶກລາຍຮັບ-ລາຍຈ່າຍສ່ວນຕົວ',

  'nav.skipToContent': 'ຂ້າມໄປຫາເນື້ອຫາ',
  'nav.label': 'ເມນູຫຼັກ',
  'nav.dashboard': 'ພາບລວມ',
  'nav.transactions': 'ລາຍການ',
  'nav.settings': 'ຕັ້ງຄ່າ',

  'action.addTransaction': 'ເພີ່ມລາຍການ',
  'action.save': 'ບັນທຶກ',
  'action.cancel': 'ຍົກເລີກ',
  'action.edit': 'ແກ້ໄຂ',
  'action.delete': 'ລຶບ',
  'action.close': 'ປິດ',
  'action.clearFilters': 'ລ້າງຕົວກອງ',

  'theme.label': 'ຮູບແບບສີ',
  'theme.light': 'ແຈ້ງ',
  'theme.dark': 'ມືດ',
  'theme.switchToLight': 'ປ່ຽນເປັນໂໝດແຈ້ງ',
  'theme.switchToDark': 'ປ່ຽນເປັນໂໝດມືດ',
  'language.label': 'ພາສາ',

  'type.label': 'ປະເພດ',
  'type.income': 'ລາຍຮັບ',
  'type.expense': 'ລາຍຈ່າຍ',
  'type.all': 'ທຸກປະເພດ',

  'period.label': 'ໄລຍະເວລາ',
  'period.today': 'ມື້ນີ້',
  'period.week': 'ອາທິດນີ້',
  'period.month': 'ເດືອນນີ້',
  'period.custom': 'ກຳນົດເອງ',
  'period.from': 'ຈາກ',
  'period.to': 'ເຖິງ',

  'summary.income': 'ລາຍຮັບທັງໝົດ',
  'summary.expense': 'ລາຍຈ່າຍທັງໝົດ',
  'summary.net': 'ກະແສເງິນສົດສຸດທິ',
  'summary.count': 'ຈຳນວນລາຍການ',
  'summary.netHelp': 'ກະແສເງິນສົດສຸດທິ ແມ່ນລາຍຮັບລົບດ້ວຍລາຍຈ່າຍທີ່ບັນທຶກໄວ້ໃນໄລຍະນີ້. ບໍ່ແມ່ນຍອດເງິນໃນບັນຊີທະນາຄານຂອງທ່ານ.',

  'dashboard.recent': 'ລາຍການຫຼ້າສຸດ',
  'dashboard.viewAll': 'ເບິ່ງທັງໝົດ',
  'dashboard.breakdown': 'ລາຍຈ່າຍຕາມໝວດໝູ່',
  'dashboard.daily': 'ລາຍຈ່າຍລາຍວັນ',
  'dashboard.dailyTableCaption': 'ລາຍຈ່າຍແຕ່ລະວັນ',
  'dashboard.noExpenses': 'ບໍ່ມີລາຍຈ່າຍໃນໄລຍະນີ້.',
  'dashboard.noTransactionsPeriod': 'ບໍ່ມີລາຍການໃນໄລຍະນີ້.',

  'empty.title': 'ຍັງບໍ່ມີລາຍການ',
  'empty.body': 'ກົດ “ເພີ່ມລາຍການ” ເພື່ອບັນທຶກລາຍຮັບ ຫຼື ລາຍຈ່າຍທຳອິດຂອງທ່ານ. ຂໍ້ມູນຂອງທ່ານຢູ່ໃນອຸປະກອນນີ້ເທົ່ານັ້ນ.',

  'form.addTitle': 'ເພີ່ມລາຍການ',
  'form.editTitle': 'ແກ້ໄຂລາຍການ',
  'form.amount': 'ຈຳນວນເງິນ (ກີບ)',
  'form.amountPlaceholder': 'ຕົວຢ່າງ: 50,000',
  'form.category': 'ໝວດໝູ່',
  'form.date': 'ວັນທີ',
  'form.description': 'ໝາຍເຫດ (ບໍ່ບັງຄັບ)',
  'form.descriptionPlaceholder': 'ຕົວຢ່າງ: ກິນເຂົ້າທ່ຽງກັບໝູ່',

  'error.amount.required': 'ກະລຸນາໃສ່ຈຳນວນເງິນ.',
  'error.amount.invalid': 'ກະລຸນາໃສ່ຕົວເລກທີ່ຖືກຕ້ອງ.',
  'error.amount.notPositive': 'ຈຳນວນເງິນຕ້ອງຫຼາຍກວ່າສູນ.',
  'error.amount.decimal': 'ຈຳນວນເງິນກີບຕ້ອງເປັນຈຳນວນເຕັມ.',
  'error.amount.tooLarge': 'ຈຳນວນເງິນນີ້ຫຼາຍເກີນໄປ.',
  'error.date': 'ກະລຸນາເລືອກວັນທີທີ່ຖືກຕ້ອງ.',
  'error.category': 'ກະລຸນາເລືອກໝວດໝູ່.',
  'error.description': 'ໝາຍເຫດຍາວເກີນໄປ (ສູງສຸດ {max} ຕົວອັກສອນ).',

  'details.title': 'ລາຍລະອຽດລາຍການ',
  'details.createdAt': 'ສ້າງເມື່ອ',
  'details.updatedAt': 'ແກ້ໄຂຫຼ້າສຸດ',
  'details.noDescription': 'ບໍ່ມີໝາຍເຫດ',

  'confirm.deleteTitle': 'ລຶບລາຍການນີ້ບໍ?',
  'confirm.deleteBody': 'ບໍ່ສາມາດກູ້ຄືນໄດ້ຫຼັງຈາກລຶບແລ້ວ.',

  'transactions.title': 'ລາຍການ',
  'transactions.filters': 'ຕົວກອງ',
  'transactions.search': 'ຄົ້ນຫາໝາຍເຫດ',
  'transactions.searchPlaceholder': 'ຄົ້ນຫາ…',
  'transactions.allCategories': 'ທຸກໝວດໝູ່',
  'transactions.results': '{count} ລາຍການ',
  'transactions.noResults': 'ບໍ່ພົບລາຍການທີ່ກົງກັບຕົວກອງນີ້.',
  'transactions.filteredTotals': 'ຍອດລວມຂອງລາຍການທີ່ສະແດງ',

  'settings.title': 'ຕັ້ງຄ່າ',
  'settings.data': 'ຂໍ້ມູນຂອງທ່ານ',
  'settings.recordCount': 'ມີ {count} ລາຍການເກັບໄວ້ໃນອຸປະກອນນີ້',
  'settings.privacyInfo':
    'ລາຍການຂອງທ່ານຖືກເກັບໄວ້ໃນບຣາວເຊີຂອງອຸປະກອນນີ້ເທົ່ານັ້ນ. ບໍ່ມີການອັບໂຫຼດຂໍ້ມູນ, ບໍ່ຕ້ອງສະໝັກບັນຊີ ແລະ ບໍ່ມີການຕິດຕາມ.',
  'settings.securityInfo':
    'ບ່ອນເກັບຂໍ້ມູນຂອງບຣາວເຊີບໍ່ໄດ້ເຂົ້າລະຫັດ. ທຸກຄົນທີ່ໃຊ້ອຸປະກອນ ແລະ ບຣາວເຊີນີ້ສາມາດເບິ່ງຂໍ້ມູນຂອງທ່ານໄດ້. ການລຶບຂໍ້ມູນບຣາວເຊີ ຫຼື ອຸປະກອນເສຍ ຈະເຮັດໃຫ້ຂໍ້ມູນຫາຍໄປ, ສະນັ້ນກະລຸນາດາວໂຫຼດໄຟລ໌ສຳຮອງເປັນປະຈຳ.',
  'settings.backupSection': 'ສົ່ງອອກ ແລະ ສຳຮອງຂໍ້ມູນ',
  'settings.exportCsv': 'ສົ່ງອອກ CSV (ຕາຕະລາງ)',
  'settings.exportJson': 'ດາວໂຫຼດໄຟລ໌ສຳຮອງ (JSON)',
  'settings.importJson': 'ກູ້ຄືນຈາກໄຟລ໌ສຳຮອງ',
  'settings.dangerSection': 'ລຶບຂໍ້ມູນ',
  'settings.deleteAll': 'ລຶບຂໍ້ມູນທັງໝົດ',

  'import.title': 'ກູ້ຄືນຂໍ້ມູນສຳຮອງ',
  'import.summary': 'ໄຟລ໌ສຳຮອງນີ້ມີ {count} ລາຍການ. ປັດຈຸບັນທ່ານມີ {existing} ລາຍການ.',
  'import.merge': 'ເພີ່ມເຂົ້າໃນຂໍ້ມູນຂອງຂ້ອຍ (ຂ້າມລາຍການທີ່ຊ້ຳ)',
  'import.replace': 'ແທນທີ່ຂໍ້ມູນທັງໝົດຂອງຂ້ອຍ',
  'import.replaceWarning': 'ການແທນທີ່ຈະລຶບ {existing} ລາຍການປັດຈຸບັນຂອງທ່ານຖາວອນ.',
  'import.confirmReplaceTitle': 'ແທນທີ່ຂໍ້ມູນທັງໝົດບໍ?',
  'import.merged': 'ນຳເຂົ້າ {added} ລາຍການແລ້ວ ({skipped} ລາຍການມີຢູ່ແລ້ວ).',
  'import.replaced': 'ກູ້ຄືນ {count} ລາຍການຈາກໄຟລ໌ສຳຮອງແລ້ວ.',
  'import.error.notJson': 'ໄຟລ໌ນີ້ບໍ່ແມ່ນໄຟລ໌ສຳຮອງທີ່ຖືກຕ້ອງ.',
  'import.error.wrongFormat': 'ໄຟລ໌ນີ້ບໍ່ແມ່ນໄຟລ໌ສຳຮອງຂອງ Lao Pocket Business.',
  'import.error.unsupportedVersion': 'ໄຟລ໌ສຳຮອງນີ້ສ້າງຈາກແອັບເວີຊັນທີ່ບໍ່ຮອງຮັບ.',
  'import.error.invalidRecords': 'ໄຟລ໌ສຳຮອງມີ {count} ລາຍການທີ່ບໍ່ຖືກຕ້ອງ, ຈຶ່ງບໍ່ໄດ້ນຳເຂົ້າຫຍັງເລີຍ.',
  'import.error.duplicateIds': 'ໄຟລ໌ສຳຮອງມີລາຍການຊ້ຳກັນ, ຈຶ່ງບໍ່ໄດ້ນຳເຂົ້າຫຍັງເລີຍ.',
  'import.error.tooLarge': 'ໄຟລ໌ໃຫຍ່ເກີນໄປ.',
  'import.error.totalsTooLarge':
    'ຈຳນວນເງິນໃນໄຟລ໌ນີ້ລວມກັນຫຼາຍເກີນກວ່າທີ່ແອັບຈະຄິດໄລ່ໄດ້ຢ່າງຖືກຕ້ອງ, ຈຶ່ງບໍ່ໄດ້ນຳເຂົ້າຫຍັງເລີຍ.',
  'amount.totalLimit':
    'ບໍ່ໄດ້ບັນທຶກ: ລາຍການນີ້ຈະເຮັດໃຫ້ລາຍຮັບລວມ ຫຼື ລາຍຈ່າຍລວມຫຼາຍເກີນກວ່າທີ່ແອັບຈະຄິດໄລ່ໄດ້ຢ່າງຖືກຕ້ອງ (ສູງສຸດ {max}). ກະລຸນາກວດຈຳນວນເງິນ.',
  'amount.inexactTotals':
    'ຈຳນວນເງິນທີ່ບັນທຶກໄວ້ລວມກັນເກີນ {max}, ຍອດລວມຈຶ່ງອາດຖືກປັດເສດ ແລະ ບໍ່ຖືກຕ້ອງທຸກຫຼັກ. ກະລຸນາກວດຫາຈຳນວນເງິນທີ່ໃສ່ຜິດ; ການລຶບລາຍການເຫຼົ່ານັ້ນຈະແກ້ບັນຫານີ້ໄດ້.',
  'summary.inexact': 'ຍອດລວມເຫຼົ່ານີ້ໃຫຍ່ເກີນກວ່າຈະຄິດໄລ່ໄດ້ຢ່າງຖືກຕ້ອງ ແລະ ອາດຖືກປັດເສດ.',
  'import.error.readFailed': 'ບໍ່ສາມາດອ່ານໄຟລ໌ໄດ້.',

  'confirm.deleteAllTitle': 'ລຶບຂໍ້ມູນທັງໝົດບໍ?',
  'confirm.deleteAllBody':
    'ການກະທຳນີ້ຈະລຶບ {count} ລາຍການ ແລະ ການຕັ້ງຄ່າທັງໝົດອອກຈາກອຸປະກອນນີ້ຖາວອນ. ກະລຸນາດາວໂຫຼດໄຟລ໌ສຳຮອງກ່ອນ ຖ້າທ່ານອາດຈະຕ້ອງການມັນ.',
  'confirm.deleteAllButton': 'ລຶບທັງໝົດ',

  'toast.added': 'ເພີ່ມລາຍການແລ້ວ',
  'toast.updated': 'ແກ້ໄຂລາຍການແລ້ວ',
  'toast.deleted': 'ລຶບລາຍການແລ້ວ',
  'toast.allDeleted': 'ລຶບຂໍ້ມູນທັງໝົດແລ້ວ',
  'toast.downloaded': 'ດາວໂຫຼດໄຟລ໌ແລ້ວ',

  'storage.unavailable':
    'ບໍ່ສາມາດໃຊ້ບ່ອນເກັບຂໍ້ມູນຂອງບຣາວເຊີໄດ້, ຂໍ້ມູນຈະຫາຍໄປເມື່ອປິດໜ້ານີ້. ກະລຸນາດາວໂຫຼດໄຟລ໌ສຳຮອງກ່ອນອອກ.',
  'storage.saveFailed': 'ບັນທຶກບໍ່ໄດ້: ບ່ອນເກັບຂໍ້ມູນອາດຈະເຕັມ. ບໍ່ມີຫຍັງຖືກປ່ຽນແປງ. ກະລຸນາດາວໂຫຼດໄຟລ໌ສຳຮອງ ແລະ ເພີ່ມພື້ນທີ່ວ່າງ, ແລ້ວລອງໃໝ່.',
  'storage.saveBlocked': 'ການປ່ຽນແປງຖືກຢຸດໄວ້ ເພື່ອປົກປ້ອງຂໍ້ມູນທີ່ເວີຊັນນີ້ອ່ານບໍ່ໄດ້ (ເບິ່ງຄຳເຕືອນດ້ານເທິງ).',
  'storage.deleteFailed': 'ລຶບລາຍການບໍ່ໄດ້: ບ່ອນເກັບຂໍ້ມູນມີບັນຫາ. ບໍ່ມີຫຍັງຖືກປ່ຽນແປງ.',
  'storage.importSaveFailed': 'ບັນທຶກຂໍ້ມູນຈາກໄຟລ໌ສຳຮອງບໍ່ໄດ້ (ບ່ອນເກັບຂໍ້ມູນອາດຈະເຕັມ). ຂໍ້ມູນເດີມຂອງທ່ານບໍ່ໄດ້ຖືກປ່ຽນແປງ.',
  'storage.deleteAllFailed':
    'ບາງຂໍ້ມູນລຶບອອກຈາກອຸປະກອນນີ້ບໍ່ໄດ້. ກະລຸນາລອງໃໝ່, ຫຼື ລຶບຂໍ້ມູນຂອງເວັບໄຊນີ້ໃນການຕັ້ງຄ່າບຣາວເຊີ.',
  'readOnly.corrupt':
    'ອ່ານຂໍ້ມູນທີ່ບັນທຶກໄວ້ບໍ່ໄດ້. ເພື່ອປົກປ້ອງຂໍ້ມູນ, ແອັບຈະບໍ່ປ່ຽນແປງມັນ ສະນັ້ນການເພີ່ມ ແລະ ແກ້ໄຂຖືກຢຸດໄວ້. ດາວໂຫຼດເພື່ອເກັບສຳເນົາ, ຫຼື ເລີ່ມຕົ້ນໃໝ່.',
  'readOnly.newerVersion':
    'ຂໍ້ມູນຂອງທ່ານຖືກບັນທຶກໂດຍແອັບເວີຊັນທີ່ໃໝ່ກວ່າ. ເພື່ອປົກປ້ອງຂໍ້ມູນ, ການເພີ່ມ ແລະ ແກ້ໄຂຖືກຢຸດໄວ້. ໂຫຼດໜ້າຄືນໃໝ່ເພື່ອໃຊ້ເວີຊັນໃໝ່, ຫຼື ດາວໂຫຼດຂໍ້ມູນ.',
  'readOnly.quarantineFailed':
    'ບາງລາຍການທີ່ບັນທຶກໄວ້ອ່ານບໍ່ໄດ້ ແລະ ບ່ອນເກັບຂໍ້ມູນບໍ່ພໍທີ່ຈະແຍກເກັບໄວ້ຢ່າງປອດໄພ. ເພື່ອປົກປ້ອງຂໍ້ມູນ, ການປ່ຽນແປງຖືກຢຸດໄວ້. ດາວໂຫຼດຂໍ້ມູນ, ແລ້ວເພີ່ມພື້ນທີ່ວ່າງ ແລະ ໂຫຼດໜ້າຄືນໃໝ່.',
  'readOnly.download': 'ດາວໂຫຼດຂໍ້ມູນທີ່ອ່ານບໍ່ໄດ້',
  'readOnly.startFresh': 'ເລີ່ມຕົ້ນໃໝ່',
  'readOnly.confirmTitle': 'ລຶບຂໍ້ມູນທີ່ອ່ານບໍ່ໄດ້ບໍ?',
  'readOnly.confirmBody':
    'ການກະທຳນີ້ຈະລຶບຂໍ້ມູນທີ່ອ່ານບໍ່ໄດ້ອອກຖາວອນ ເພື່ອໃຫ້ທ່ານເລີ່ມຕົ້ນໃໝ່ດ້ວຍລາຍການວ່າງ. ກະລຸນາດາວໂຫຼດກ່ອນ ຖ້າທ່ານອາດຈະຕ້ອງການມັນ.',
  'readOnly.confirmButton': 'ລຶບ ແລະ ເລີ່ມຕົ້ນໃໝ່',
  'readOnly.cleared': 'ລຶບຂໍ້ມູນທີ່ອ່ານບໍ່ໄດ້ແລ້ວ. ທ່ານສາມາດເພີ່ມລາຍການໄດ້ອີກ.',
  'setAside.notice':
    'ມີ {count} ລາຍການທີ່ແອັບເວີຊັນນີ້ອ່ານບໍ່ໄດ້. ລາຍການເຫຼົ່ານີ້ຖືກແຍກເກັບໄວ້ຢ່າງປອດໄພໃນບຣາວເຊີນີ້ ແລະ ບໍ່ຖືກສະແດງ ຫຼື ນັບລວມ.',
  'setAside.download': 'ດາວໂຫຼດລາຍການທີ່ແຍກເກັບໄວ້',

  'footer.privacy': 'ຂໍ້ມູນຂອງທ່ານຢູ່ໃນອຸປະກອນນີ້. ບໍ່ຕ້ອງສະໝັກບັນຊີ. ບໍ່ມີການຕິດຕາມ.',

  'backup.reminderTitle': 'ເຖິງເວລາສຳຮອງຂໍ້ມູນແລ້ວ',
  'backup.reminderNever':
    'ທ່ານຍັງບໍ່ເຄີຍດາວໂຫຼດໄຟລ໌ສຳຮອງໃນອຸປະກອນນີ້. ລາຍການຂອງທ່ານມີຢູ່ບ່ອນນີ້ບ່ອນດຽວ, ສະນັ້ນກະລຸນາດາວໂຫຼດໄຟລ໌ສຳຮອງຢ່າງໜ້ອຍອາທິດລະເທື່ອ.',
  'backup.reminderLast':
    'ທ່ານດາວໂຫຼດໄຟລ໌ສຳຮອງຄັ້ງຫຼ້າສຸດເມື່ອ {days} ມື້ກ່ອນ. ກະລຸນາດາວໂຫຼດໄຟລ໌ສຳຮອງໃໝ່ຢ່າງໜ້ອຍອາທິດລະເທື່ອ ເພື່ອປົກປ້ອງລາຍການຂອງທ່ານ.',
  'backup.downloadNow': 'ດາວໂຫຼດໄຟລ໌ສຳຮອງ',
  'backup.alreadyDone': 'ຂ້ອຍມີໄຟລ໌ສຳຮອງແລ້ວ',
  'backup.later': 'ເຕືອນຂ້ອຍພາຍຫຼັງ',
  'backup.markedToast': 'ບັນທຶກແລ້ວ. ຈະເຕືອນອີກຄັ້ງໃນ 7 ມື້.',
  'backup.statusNever': 'ຍັງບໍ່ເຄີຍດາວໂຫຼດໄຟລ໌ສຳຮອງຈາກອຸປະກອນນີ້.',
  'backup.statusLast': 'ດາວໂຫຼດໄຟລ໌ສຳຮອງຄັ້ງຫຼ້າສຸດ: {date}',
  'backup.statusMarked': 'ທ່ານໝາຍວ່າໄດ້ສຳຮອງແລ້ວ: {date}',
  'backup.weeklyTip': 'ຄຳແນະນຳ: ດາວໂຫຼດໄຟລ໌ສຳຮອງຢ່າງໜ້ອຍອາທິດລະເທື່ອ ແລະ ເກັບໄຟລ໌ໄວ້ບ່ອນທີ່ປອດໄພ.',
  'backup.reminderLabel': 'ການເຕືອນສຳຮອງຂໍ້ມູນ',

  'connection.online': 'ອອນລາຍ',
  'connection.offline': 'ອອບລາຍ',
  'connection.label': 'ການເຊື່ອມຕໍ່: {status}',
  'offline.banner':
    'ທ່ານກຳລັງອອບລາຍ. ແອັບຍັງໃຊ້ງານໄດ້ປົກກະຕິ: ທ່ານສາມາດເບິ່ງ ແລະ ເພີ່ມລາຍການໄດ້, ແລະ ລາຍການຈະຖືກບັນທຶກໄວ້ໃນອຸປະກອນນີ້. ບໍ່ມີການອັບໂຫຼດ ຫຼື ຊິງຂໍ້ມູນ.',
  'pwa.updateAvailable': 'ມີແອັບເວີຊັນໃໝ່ພ້ອມແລ້ວ.',
  'pwa.updateNow': 'ອັບເດດດຽວນີ້',
  'pwa.reloadNeeded': 'ແອັບຖືກອັບເດດໃນແຖບອື່ນແລ້ວ. ເຮັດສິ່ງທີ່ທ່ານກຳລັງເຮັດໃຫ້ແລ້ວ, ຈາກນັ້ນໂຫຼດໜ້ານີ້ຄືນໃໝ່ເພື່ອໃຊ້ເວີຊັນໃໝ່.',
  'pwa.reloadNow': 'ໂຫຼດຄືນໃໝ່ດຽວນີ້',
  'pwa.offlineReadyToast': 'ແອັບພ້ອມໃຊ້ງານແບບອອບລາຍແລ້ວ',
  'pwa.section': 'ການໃຊ້ແບບອອບລາຍ ແລະ ການຕິດຕັ້ງ',
  'pwa.connection': 'ການເຊື່ອມຕໍ່',
  'pwa.offlineAccess': 'ການໃຊ້ແບບອອບລາຍ',
  'pwa.offlineReady': 'ພ້ອມແລ້ວ: ແອັບເປີດໄດ້ໂດຍບໍ່ຕ້ອງມີອິນເຕີເນັດ',
  'pwa.offlineNotReady': 'ຍັງບໍ່ພ້ອມ: ກະລຸນາເປີດແອັບໜຶ່ງຄັ້ງຕອນມີອິນເຕີເນັດ',
  'pwa.offlineUnsupported': 'ບຣາວເຊີນີ້ບໍ່ຮອງຮັບ',
  'pwa.noSync':
    'ການໃຊ້ແບບອອບລາຍ ໝາຍຄວາມວ່າແອັບເປີດໄດ້ໂດຍບໍ່ຕ້ອງມີອິນເຕີເນັດ. ມັນບໍ່ແມ່ນການຊິງຂໍ້ມູນ: ລາຍການຂອງທ່ານຖືກເກັບໄວ້ໃນອຸປະກອນນີ້ເທົ່ານັ້ນ ແລະ ບໍ່ເຄີຍຖືກອັບໂຫຼດ. ໂທລະສັບ ຫຼື ຄອມພິວເຕີເຄື່ອງອື່ນຈະບໍ່ເຫັນຂໍ້ມູນນີ້. ຖ້າຕ້ອງການຍ້າຍຂໍ້ມູນ, ໃຫ້ໃຊ້ໄຟລ໌ສຳຮອງ.',
  'pwa.install': 'ຕິດຕັ້ງແອັບ',
  'pwa.installed': 'ຕິດຕັ້ງເປັນແອັບໃນອຸປະກອນນີ້ແລ້ວ',
  'pwa.installHelp': 'ວິທີຕິດຕັ້ງ',
  'pwa.installAndroid': 'Android (Chrome): ເປີດເມນູ ⋮ ແລ້ວເລືອກ “ຕິດຕັ້ງແອັບ” ຫຼື “ເພີ່ມໃສ່ໜ້າຈໍຫຼັກ”.',
  'pwa.installIos': 'iPhone / iPad (Safari): ກົດປຸ່ມແບ່ງປັນ (Share), ແລ້ວເລືອກ “ເພີ່ມໃສ່ໜ້າຈໍໂຮມ” (Add to Home Screen).',
  'pwa.installDesktop': 'ຄອມພິວເຕີ (Chrome ຫຼື Edge): ກົດໄອຄອນຕິດຕັ້ງຢູ່ແຖບທີ່ຢູ່, ຫຼື ເປີດເມນູແລ້ວເລືອກ “ຕິດຕັ້ງ”.',
  'pwa.installIosData':
    'ໃນ iPhone ແລະ iPad, ແອັບທີ່ຢູ່ໜ້າຈໍໂຮມຈະເກັບຂໍ້ມູນແຍກຕ່າງຫາກຈາກ Safari. ເພື່ອຍ້າຍລາຍການທີ່ມີຢູ່, ໃຫ້ດາວໂຫຼດໄຟລ໌ສຳຮອງໃນ Safari ແລ້ວກູ້ຄືນໃນແອັບທີ່ຕິດຕັ້ງ.',

  'category.salary': 'ເງິນເດືອນ',
  'category.business': 'ລາຍຮັບຈາກທຸລະກິດ',
  'category.allowance': 'ເງິນອຸດໜູນ',
  'category.otherIncome': 'ລາຍຮັບອື່ນໆ',
  'category.food': 'ອາຫານ',
  'category.transport': 'ການເດີນທາງ',
  'category.housing': 'ທີ່ພັກອາໄສ',
  'category.utilities': 'ຄ່ານ້ຳ-ຄ່າໄຟ',
  'category.education': 'ການສຶກສາ',
  'category.shopping': 'ຊື້ເຄື່ອງ',
  'category.health': 'ສຸຂະພາບ',
  'category.entertainment': 'ບັນເທີງ',
  'category.otherExpense': 'ລາຍຈ່າຍອື່ນໆ',
  'category.unknown': 'ໝວດໝູ່ບໍ່ຮູ້ຈັກ',
};

const th: Dictionary = {
  'app.name': 'Lao Pocket Business',
  'app.tagline': 'บันทึกรายรับ-รายจ่ายส่วนตัว',

  'nav.skipToContent': 'ข้ามไปยังเนื้อหา',
  'nav.label': 'เมนูหลัก',
  'nav.dashboard': 'ภาพรวม',
  'nav.transactions': 'รายการ',
  'nav.settings': 'ตั้งค่า',

  'action.addTransaction': 'เพิ่มรายการ',
  'action.save': 'บันทึก',
  'action.cancel': 'ยกเลิก',
  'action.edit': 'แก้ไข',
  'action.delete': 'ลบ',
  'action.close': 'ปิด',
  'action.clearFilters': 'ล้างตัวกรอง',

  'theme.label': 'ธีม',
  'theme.light': 'สว่าง',
  'theme.dark': 'มืด',
  'theme.switchToLight': 'เปลี่ยนเป็นโหมดสว่าง',
  'theme.switchToDark': 'เปลี่ยนเป็นโหมดมืด',
  'language.label': 'ภาษา',

  'type.label': 'ประเภท',
  'type.income': 'รายรับ',
  'type.expense': 'รายจ่าย',
  'type.all': 'ทุกประเภท',

  'period.label': 'ช่วงเวลา',
  'period.today': 'วันนี้',
  'period.week': 'สัปดาห์นี้',
  'period.month': 'เดือนนี้',
  'period.custom': 'กำหนดเอง',
  'period.from': 'ตั้งแต่',
  'period.to': 'ถึง',

  'summary.income': 'รายรับทั้งหมด',
  'summary.expense': 'รายจ่ายทั้งหมด',
  'summary.net': 'กระแสเงินสดสุทธิ',
  'summary.count': 'จำนวนรายการ',
  'summary.netHelp': 'กระแสเงินสดสุทธิคือรายรับลบรายจ่ายที่บันทึกไว้ในช่วงเวลานี้ ไม่ใช่ยอดเงินในบัญชีธนาคารของคุณ',

  'dashboard.recent': 'รายการล่าสุด',
  'dashboard.viewAll': 'ดูทั้งหมด',
  'dashboard.breakdown': 'รายจ่ายตามหมวดหมู่',
  'dashboard.daily': 'รายจ่ายรายวัน',
  'dashboard.dailyTableCaption': 'รายจ่ายแต่ละวัน',
  'dashboard.noExpenses': 'ไม่มีรายจ่ายในช่วงเวลานี้',
  'dashboard.noTransactionsPeriod': 'ไม่มีรายการในช่วงเวลานี้',

  'empty.title': 'ยังไม่มีรายการ',
  'empty.body': 'แตะ “เพิ่มรายการ” เพื่อบันทึกรายรับหรือรายจ่ายแรกของคุณ ข้อมูลของคุณอยู่ในอุปกรณ์นี้เท่านั้น',

  'form.addTitle': 'เพิ่มรายการ',
  'form.editTitle': 'แก้ไขรายการ',
  'form.amount': 'จำนวนเงิน (กีบ)',
  'form.amountPlaceholder': 'เช่น 50,000',
  'form.category': 'หมวดหมู่',
  'form.date': 'วันที่',
  'form.description': 'หมายเหตุ (ไม่บังคับ)',
  'form.descriptionPlaceholder': 'เช่น กินข้าวเที่ยงกับเพื่อน',

  'error.amount.required': 'กรุณากรอกจำนวนเงิน',
  'error.amount.invalid': 'กรุณากรอกตัวเลขที่ถูกต้อง',
  'error.amount.notPositive': 'จำนวนเงินต้องมากกว่าศูนย์',
  'error.amount.decimal': 'จำนวนเงินกีบต้องเป็นจำนวนเต็ม',
  'error.amount.tooLarge': 'จำนวนเงินนี้มากเกินไป',
  'error.date': 'กรุณาเลือกวันที่ที่ถูกต้อง',
  'error.category': 'กรุณาเลือกหมวดหมู่',
  'error.description': 'หมายเหตุยาวเกินไป (สูงสุด {max} ตัวอักษร)',

  'details.title': 'รายละเอียดรายการ',
  'details.createdAt': 'สร้างเมื่อ',
  'details.updatedAt': 'แก้ไขล่าสุด',
  'details.noDescription': 'ไม่มีหมายเหตุ',

  'confirm.deleteTitle': 'ลบรายการนี้หรือไม่?',
  'confirm.deleteBody': 'ไม่สามารถกู้คืนได้หลังจากลบแล้ว',

  'transactions.title': 'รายการ',
  'transactions.filters': 'ตัวกรอง',
  'transactions.search': 'ค้นหาหมายเหตุ',
  'transactions.searchPlaceholder': 'ค้นหา…',
  'transactions.allCategories': 'ทุกหมวดหมู่',
  'transactions.results': '{count} รายการ',
  'transactions.noResults': 'ไม่พบรายการที่ตรงกับตัวกรองนี้',
  'transactions.filteredTotals': 'ยอดรวมของรายการที่แสดง',

  'settings.title': 'ตั้งค่า',
  'settings.data': 'ข้อมูลของคุณ',
  'settings.recordCount': 'มี {count} รายการเก็บไว้ในอุปกรณ์นี้',
  'settings.privacyInfo':
    'รายการของคุณถูกเก็บไว้ในเบราว์เซอร์ของอุปกรณ์นี้เท่านั้น ไม่มีการอัปโหลดข้อมูล ไม่ต้องสมัครบัญชี และไม่มีการติดตาม',
  'settings.securityInfo':
    'ที่เก็บข้อมูลของเบราว์เซอร์ไม่ได้เข้ารหัส ทุกคนที่ใช้อุปกรณ์และเบราว์เซอร์นี้สามารถดูข้อมูลของคุณได้ การล้างข้อมูลเบราว์เซอร์หรืออุปกรณ์สูญหายจะทำให้ข้อมูลหายไป จึงควรดาวน์โหลดไฟล์สำรองเป็นประจำ',
  'settings.backupSection': 'ส่งออกและสำรองข้อมูล',
  'settings.exportCsv': 'ส่งออก CSV (ตาราง)',
  'settings.exportJson': 'ดาวน์โหลดไฟล์สำรอง (JSON)',
  'settings.importJson': 'กู้คืนจากไฟล์สำรอง',
  'settings.dangerSection': 'ลบข้อมูล',
  'settings.deleteAll': 'ลบข้อมูลทั้งหมด',

  'import.title': 'กู้คืนข้อมูลสำรอง',
  'import.summary': 'ไฟล์สำรองนี้มี {count} รายการ ปัจจุบันคุณมี {existing} รายการ',
  'import.merge': 'เพิ่มเข้าไปในข้อมูลของฉัน (ข้ามรายการที่ซ้ำ)',
  'import.replace': 'แทนที่ข้อมูลทั้งหมดของฉัน',
  'import.replaceWarning': 'การแทนที่จะลบ {existing} รายการปัจจุบันของคุณอย่างถาวร',
  'import.confirmReplaceTitle': 'แทนที่ข้อมูลทั้งหมดหรือไม่?',
  'import.merged': 'นำเข้า {added} รายการแล้ว ({skipped} รายการมีอยู่แล้ว)',
  'import.replaced': 'กู้คืน {count} รายการจากไฟล์สำรองแล้ว',
  'import.error.notJson': 'ไฟล์นี้ไม่ใช่ไฟล์สำรองที่ถูกต้อง',
  'import.error.wrongFormat': 'ไฟล์นี้ไม่ใช่ไฟล์สำรองของ Lao Pocket Business',
  'import.error.unsupportedVersion': 'ไฟล์สำรองนี้สร้างจากแอปเวอร์ชันที่ไม่รองรับ',
  'import.error.invalidRecords': 'ไฟล์สำรองมี {count} รายการที่ไม่ถูกต้อง จึงไม่ได้นำเข้าข้อมูลใดๆ',
  'import.error.duplicateIds': 'ไฟล์สำรองมีรายการซ้ำกัน จึงไม่ได้นำเข้าข้อมูลใดๆ',
  'import.error.tooLarge': 'ไฟล์มีขนาดใหญ่เกินไป',
  'import.error.totalsTooLarge':
    'จำนวนเงินในไฟล์นี้รวมกันมากเกินกว่าที่แอปจะคำนวณได้อย่างถูกต้อง จึงไม่ได้นำเข้าข้อมูลใดๆ',
  'amount.totalLimit':
    'ไม่ได้บันทึก: รายการนี้จะทำให้รายรับรวมหรือรายจ่ายรวมมากเกินกว่าที่แอปจะคำนวณได้อย่างถูกต้อง (สูงสุด {max}) กรุณาตรวจสอบจำนวนเงิน',
  'amount.inexactTotals':
    'จำนวนเงินที่บันทึกไว้รวมกันเกิน {max} ยอดรวมจึงอาจถูกปัดเศษและไม่ถูกต้องทุกหลัก กรุณาตรวจหาจำนวนเงินที่ป้อนผิด การลบรายการเหล่านั้นจะแก้ปัญหานี้ได้',
  'summary.inexact': 'ยอดรวมเหล่านี้มากเกินกว่าจะคำนวณได้อย่างถูกต้องและอาจถูกปัดเศษ',
  'import.error.readFailed': 'ไม่สามารถอ่านไฟล์ได้',

  'confirm.deleteAllTitle': 'ลบข้อมูลทั้งหมดหรือไม่?',
  'confirm.deleteAllBody':
    'การกระทำนี้จะลบ {count} รายการและการตั้งค่าทั้งหมดออกจากอุปกรณ์นี้อย่างถาวร กรุณาดาวน์โหลดไฟล์สำรองก่อนหากคุณอาจต้องใช้',
  'confirm.deleteAllButton': 'ลบทั้งหมด',

  'toast.added': 'เพิ่มรายการแล้ว',
  'toast.updated': 'แก้ไขรายการแล้ว',
  'toast.deleted': 'ลบรายการแล้ว',
  'toast.allDeleted': 'ลบข้อมูลทั้งหมดแล้ว',
  'toast.downloaded': 'ดาวน์โหลดไฟล์แล้ว',

  'storage.unavailable':
    'ไม่สามารถใช้ที่เก็บข้อมูลของเบราว์เซอร์ได้ ข้อมูลจะหายไปเมื่อปิดหน้านี้ กรุณาดาวน์โหลดไฟล์สำรองก่อนออก',
  'storage.saveFailed': 'บันทึกไม่ได้: ที่เก็บข้อมูลอาจเต็ม ไม่มีสิ่งใดถูกเปลี่ยนแปลง กรุณาดาวน์โหลดไฟล์สำรองและเพิ่มพื้นที่ว่าง แล้วลองใหม่',
  'storage.saveBlocked': 'การเปลี่ยนแปลงถูกหยุดไว้เพื่อปกป้องข้อมูลที่เวอร์ชันนี้อ่านไม่ได้ (ดูคำเตือนด้านบน)',
  'storage.deleteFailed': 'ลบรายการไม่ได้: ที่เก็บข้อมูลมีปัญหา ไม่มีสิ่งใดถูกเปลี่ยนแปลง',
  'storage.importSaveFailed': 'บันทึกข้อมูลจากไฟล์สำรองไม่ได้ (ที่เก็บข้อมูลอาจเต็ม) ข้อมูลเดิมของคุณไม่ได้ถูกเปลี่ยนแปลง',
  'storage.deleteAllFailed':
    'ข้อมูลบางส่วนลบออกจากอุปกรณ์นี้ไม่ได้ กรุณาลองใหม่ หรือล้างข้อมูลของเว็บไซต์นี้ในการตั้งค่าเบราว์เซอร์',
  'readOnly.corrupt':
    'อ่านข้อมูลที่บันทึกไว้ไม่ได้ เพื่อปกป้องข้อมูล แอปจะไม่เปลี่ยนแปลงข้อมูลนั้น การเพิ่มและแก้ไขจึงถูกหยุดไว้ ดาวน์โหลดเพื่อเก็บสำเนา หรือเริ่มต้นใหม่',
  'readOnly.newerVersion':
    'ข้อมูลของคุณถูกบันทึกโดยแอปเวอร์ชันที่ใหม่กว่า เพื่อปกป้องข้อมูล การเพิ่มและแก้ไขจึงถูกหยุดไว้ โหลดหน้าใหม่เพื่อใช้เวอร์ชันใหม่ หรือดาวน์โหลดข้อมูล',
  'readOnly.quarantineFailed':
    'บางรายการที่บันทึกไว้อ่านไม่ได้ และที่เก็บข้อมูลไม่พอที่จะแยกเก็บไว้อย่างปลอดภัย เพื่อปกป้องข้อมูล การเปลี่ยนแปลงจึงถูกหยุดไว้ ดาวน์โหลดข้อมูล แล้วเพิ่มพื้นที่ว่างและโหลดหน้าใหม่',
  'readOnly.download': 'ดาวน์โหลดข้อมูลที่อ่านไม่ได้',
  'readOnly.startFresh': 'เริ่มต้นใหม่',
  'readOnly.confirmTitle': 'ลบข้อมูลที่อ่านไม่ได้หรือไม่?',
  'readOnly.confirmBody':
    'การกระทำนี้จะลบข้อมูลที่อ่านไม่ได้อย่างถาวร เพื่อให้คุณเริ่มต้นใหม่ด้วยรายการว่าง กรุณาดาวน์โหลดก่อนหากคุณอาจต้องใช้',
  'readOnly.confirmButton': 'ลบและเริ่มต้นใหม่',
  'readOnly.cleared': 'ลบข้อมูลที่อ่านไม่ได้แล้ว คุณสามารถเพิ่มรายการได้อีกครั้ง',
  'setAside.notice':
    'มี {count} รายการที่แอปเวอร์ชันนี้อ่านไม่ได้ รายการเหล่านี้ถูกแยกเก็บไว้อย่างปลอดภัยในเบราว์เซอร์นี้ และไม่ถูกแสดงหรือนับรวม',
  'setAside.download': 'ดาวน์โหลดรายการที่แยกเก็บไว้',

  'footer.privacy': 'ข้อมูลของคุณอยู่ในอุปกรณ์นี้ ไม่ต้องสมัครบัญชี ไม่มีการติดตาม',

  'backup.reminderTitle': 'ถึงเวลาสำรองข้อมูลแล้ว',
  'backup.reminderNever':
    'คุณยังไม่เคยดาวน์โหลดไฟล์สำรองในอุปกรณ์นี้ รายการของคุณมีอยู่ที่นี่เท่านั้น จึงควรดาวน์โหลดไฟล์สำรองอย่างน้อยสัปดาห์ละครั้ง',
  'backup.reminderLast':
    'คุณดาวน์โหลดไฟล์สำรองครั้งล่าสุดเมื่อ {days} วันก่อน กรุณาดาวน์โหลดไฟล์สำรองใหม่อย่างน้อยสัปดาห์ละครั้งเพื่อปกป้องรายการของคุณ',
  'backup.downloadNow': 'ดาวน์โหลดไฟล์สำรอง',
  'backup.alreadyDone': 'ฉันมีไฟล์สำรองแล้ว',
  'backup.later': 'เตือนฉันภายหลัง',
  'backup.markedToast': 'บันทึกแล้ว จะเตือนอีกครั้งใน 7 วัน',
  'backup.statusNever': 'ยังไม่เคยดาวน์โหลดไฟล์สำรองจากอุปกรณ์นี้',
  'backup.statusLast': 'ดาวน์โหลดไฟล์สำรองครั้งล่าสุด: {date}',
  'backup.statusMarked': 'คุณทำเครื่องหมายว่าสำรองแล้ว: {date}',
  'backup.weeklyTip': 'คำแนะนำ: ดาวน์โหลดไฟล์สำรองอย่างน้อยสัปดาห์ละครั้งและเก็บไฟล์ไว้ในที่ปลอดภัย',
  'backup.reminderLabel': 'การเตือนสำรองข้อมูล',

  'connection.online': 'ออนไลน์',
  'connection.offline': 'ออฟไลน์',
  'connection.label': 'การเชื่อมต่อ: {status}',
  'offline.banner':
    'คุณกำลังออฟไลน์ แอปยังใช้งานได้ตามปกติ: คุณสามารถดูและเพิ่มรายการได้ และรายการจะถูกบันทึกไว้ในอุปกรณ์นี้ ไม่มีการอัปโหลดหรือซิงค์ข้อมูล',
  'pwa.updateAvailable': 'แอปเวอร์ชันใหม่พร้อมแล้ว',
  'pwa.updateNow': 'อัปเดตตอนนี้',
  'pwa.reloadNeeded': 'แอปถูกอัปเดตในแท็บอื่นแล้ว ทำสิ่งที่กำลังทำให้เสร็จ แล้วโหลดหน้านี้ใหม่เพื่อใช้เวอร์ชันใหม่',
  'pwa.reloadNow': 'โหลดใหม่ตอนนี้',
  'pwa.offlineReadyToast': 'แอปพร้อมใช้งานแบบออฟไลน์แล้ว',
  'pwa.section': 'การใช้งานออฟไลน์และการติดตั้ง',
  'pwa.connection': 'การเชื่อมต่อ',
  'pwa.offlineAccess': 'การใช้งานออฟไลน์',
  'pwa.offlineReady': 'พร้อมแล้ว: แอปเปิดได้โดยไม่ต้องใช้อินเทอร์เน็ต',
  'pwa.offlineNotReady': 'ยังไม่พร้อม: กรุณาเปิดแอปหนึ่งครั้งขณะมีอินเทอร์เน็ต',
  'pwa.offlineUnsupported': 'เบราว์เซอร์นี้ไม่รองรับ',
  'pwa.noSync':
    'การใช้งานออฟไลน์หมายถึงแอปเปิดได้โดยไม่ต้องใช้อินเทอร์เน็ต ไม่ใช่การซิงค์ข้อมูล: รายการของคุณถูกเก็บไว้ในอุปกรณ์นี้เท่านั้นและไม่เคยถูกอัปโหลด โทรศัพท์หรือคอมพิวเตอร์เครื่องอื่นจะไม่เห็นข้อมูลนี้ หากต้องการย้ายข้อมูล ให้ใช้ไฟล์สำรอง',
  'pwa.install': 'ติดตั้งแอป',
  'pwa.installed': 'ติดตั้งเป็นแอปในอุปกรณ์นี้แล้ว',
  'pwa.installHelp': 'วิธีติดตั้ง',
  'pwa.installAndroid': 'Android (Chrome): เปิดเมนู ⋮ แล้วเลือก “ติดตั้งแอป” หรือ “เพิ่มลงในหน้าจอหลัก”',
  'pwa.installIos': 'iPhone / iPad (Safari): แตะปุ่มแชร์ แล้วเลือก “เพิ่มไปยังหน้าจอโฮม”',
  'pwa.installDesktop': 'คอมพิวเตอร์ (Chrome หรือ Edge): คลิกไอคอนติดตั้งในแถบที่อยู่ หรือเปิดเมนูแล้วเลือก “ติดตั้ง”',
  'pwa.installIosData':
    'บน iPhone และ iPad แอปบนหน้าจอโฮมจะเก็บข้อมูลแยกจาก Safari หากต้องการย้ายรายการที่มีอยู่ ให้ดาวน์โหลดไฟล์สำรองใน Safari แล้วกู้คืนในแอปที่ติดตั้ง',

  'category.salary': 'เงินเดือน',
  'category.business': 'รายได้จากธุรกิจ',
  'category.allowance': 'เบี้ยเลี้ยง',
  'category.otherIncome': 'รายรับอื่นๆ',
  'category.food': 'อาหาร',
  'category.transport': 'การเดินทาง',
  'category.housing': 'ที่อยู่อาศัย',
  'category.utilities': 'ค่าน้ำค่าไฟ',
  'category.education': 'การศึกษา',
  'category.shopping': 'ช้อปปิ้ง',
  'category.health': 'สุขภาพ',
  'category.entertainment': 'ความบันเทิง',
  'category.otherExpense': 'รายจ่ายอื่นๆ',
  'category.unknown': 'หมวดหมู่ที่ไม่รู้จัก',
};

export const DICTIONARIES: Record<Language, Dictionary> = { lo, th, en };

export function isLanguage(value: unknown): value is Language {
  return value === 'lo' || value === 'th' || value === 'en';
}

export function localeFor(language: Language): string {
  return LANGUAGES.find((l) => l.code === language)?.locale ?? 'lo-LA';
}

/** Translate a key, replacing `{name}` placeholders with values. */
export function translate(language: Language, key: TranslationKey, vars?: Record<string, string | number>): string {
  const template = DICTIONARIES[language][key] ?? DICTIONARIES.en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}
