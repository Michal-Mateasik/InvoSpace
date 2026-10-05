import { ZipFormatError } from './zipReader';

// Tabuľky v poradí, v akom sa vkladajú (rodičia pred deťmi, kvôli cudzím kľúčom).
// Pri mazaní sa ide opačným poradím.
export const RESTORE_TABLES = [
  'companies',
  'categories',
  'receipts',
  'receipt_vat',
  'merchant_categories',
  'settings',
] as const;

export type TableName = (typeof RESTORE_TABLES)[number];
export type Row = Record<string, unknown>;

export type BackupData = {
  app: string;
  format: number;
  createdAt: string;
  schemaVersion: number;
  tables: Record<TableName, Row[]>;
};

// Overí, že JSON je záloha InvoSpace a že ju táto verzia aplikácie vie prečítať.
export function parseBackupJson(text: string, currentSchemaVersion: number): BackupData {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ZipFormatError('Záloha je poškodená (data.json sa nedá prečítať).');
  }
  const backup = data as Partial<BackupData> | null;
  if (!backup || backup.app !== 'InvoSpace' || typeof backup.tables !== 'object' || backup.tables === null) {
    throw new ZipFormatError('Vybraný súbor nie je záloha aplikácie InvoSpace.');
  }
  if (backup.format !== 1) {
    throw new ZipFormatError('Záloha je v neznámom formáte.');
  }
  if (typeof backup.schemaVersion !== 'number' || backup.schemaVersion > currentSchemaVersion) {
    throw new ZipFormatError('Záloha pochádza z novšej verzie aplikácie. Najprv aktualizuj aplikáciu.');
  }
  for (const table of RESTORE_TABLES) {
    if (!Array.isArray(backup.tables[table])) {
      throw new ZipFormatError(`V zálohe chýba tabuľka „${table}“.`);
    }
  }
  return backup as BackupData;
}

// SQL na vloženie jedného riadku. Vkladajú sa len stĺpce, ktoré existujú aj v tejto verzii databázy
// (staršia záloha nemusí mať novšie stĺpce, tie dostanú predvolenú hodnotu; neznáme stĺpce sa preskočia).
// Názvy tabuliek a stĺpcov nikdy nepochádzajú priamo zo zálohy bez kontroly voči schéme.
export function buildInsert(table: TableName, tableColumns: string[], row: Row): { sql: string; values: unknown[] } {
  const columns = Object.keys(row).filter((key) => tableColumns.includes(key));
  if (columns.length === 0) throw new ZipFormatError(`Záloha obsahuje neplatný riadok v tabuľke „${table}“.`);
  const placeholders = columns.map(() => '?').join(', ');
  return {
    sql: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
    values: columns.map((column) => row[column] ?? null),
  };
}
