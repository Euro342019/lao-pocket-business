import type { Transaction } from '../../types/transaction';
import { sortTransactions } from '../../features/transactions/transactions';
import { createBackup, serializeBackup } from './backup';
import { downloadFile, timestampForFilename } from './download';

/** Start the download of a full JSON backup file. Used by Settings and the backup reminder. */
export function downloadJsonBackup(transactions: readonly Transaction[]): void {
  downloadFile(
    `lao-pocket-backup_${timestampForFilename()}.json`,
    serializeBackup(createBackup(sortTransactions(transactions))),
    'application/json',
  );
}
