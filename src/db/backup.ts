import { getDb } from './database';

// Tabuľky, ktoré sa zálohujú (všetky dáta aplikácie).
const BACKUP_TABLES = ['companies', 'categories', 'receipts', 'receipt_vat', 'merchant_categories', 'settings'] as const;

export type DatabaseDump = {
  schemaVersion: number; // verzia schémy (PRAGMA user_version), aby bolo jasné, z akej verzie appky záloha je
  tables: Record<(typeof BACKUP_TABLES)[number], Record<string, unknown>[]>;
};

// Prečíta celý obsah databázy ako obyčajné objekty. Názvy tabuliek sú pevný zoznam vyššie,
// nie vstup od používateľa, takže ich môžeme vložiť do SQL.
export async function dumpDatabase(): Promise<DatabaseDump> {
  const db = await getDb();
  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const tables = {} as DatabaseDump['tables'];
  for (const table of BACKUP_TABLES) {
    tables[table] = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${table}`);
  }
  return { schemaVersion: version?.user_version ?? 0, tables };
}

// Dátum poslednej zálohy (ISO), aby sa dalo v Nastaveniach zobraziť, kedy sa naposledy zálohovalo.
export async function getLastBackupAt(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'last_backup_at'");
  return row?.value ?? null;
}

export async function setLastBackupAt(iso: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_backup_at', ?)", iso);
}
