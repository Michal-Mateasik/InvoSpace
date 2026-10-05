import type { SQLiteDatabase } from 'expo-sqlite';

import { formatInternalNumber, parseUsedNumber } from '@/utils/internalNumber';

import { getDb } from './database';

// Interné číslovanie dokladov je nastavené pri firme (predpona, ďalšie číslo a počet číslic v tabuľke
// companies), takže každá firma má vlastný rad, napr. PD1, PD2, … alebo 26/V-001, 26/V-002, …

type NumberingRow = { internal_prefix: string; internal_next: number; internal_width: number };

async function readNumbering(db: SQLiteDatabase, companyId: number): Promise<NumberingRow> {
  const row = await db.getFirstAsync<NumberingRow>(
    'SELECT internal_prefix, internal_next, internal_width FROM companies WHERE id = ?',
    companyId
  );
  return row ?? { internal_prefix: 'PD', internal_next: 1, internal_width: 0 };
}

// Číslo, ktoré sa navrhne pre nový doklad firmy, napr. "26/V-005".
export async function getSuggestedInternalNumber(companyId: number): Promise<string> {
  const row = await readNumbering(await getDb(), companyId);
  return formatInternalNumber(row.internal_prefix, row.internal_next, row.internal_width);
}

// Po uložení dokladu posunie počítadlo firmy za použité číslo. Ak používateľ zadal vlastné číslo
// v tvare predpona + číslo (napr. 26/V-020), počítadlo preskočí na 26/V-021, aby sa čísla neopakovali.
// Číslo v inom tvare (napr. "FA-7") počítadlo nemení.
// Volá sa vnútri transakcie uloženia dokladu, preto dostáva už otvorené spojenie.
export async function advanceCounterAfter(
  db: SQLiteDatabase,
  companyId: number,
  usedNumber: string | null
): Promise<void> {
  if (!usedNumber) return;
  const row = await readNumbering(db, companyId);
  const used = parseUsedNumber(row.internal_prefix, usedNumber);
  if (used !== null && used >= row.internal_next) {
    await db.runAsync('UPDATE companies SET internal_next = ? WHERE id = ?', used + 1, companyId);
  }
}

export async function isInternalNumberTaken(
  companyId: number,
  number: string,
  exceptReceiptId: number | null
): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM receipts WHERE company_id = ? AND internal_number = ? AND id != ?',
    companyId,
    number,
    exceptReceiptId ?? -1
  );
  return row !== null;
}
