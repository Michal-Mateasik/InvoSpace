import type { SQLiteDatabase } from 'expo-sqlite';

import type { VatRow } from '@/types';

import { getDb } from './database';

type VatRowRecord = { receipt_id: number; vat_rate: number; base_cents: number; vat_cents: number };

const toVatRow = (r: VatRowRecord): VatRow => ({ rate: r.vat_rate, base_cents: r.base_cents, vat_cents: r.vat_cents });

export async function getVatRows(receiptId: number): Promise<VatRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<VatRowRecord>(
    'SELECT * FROM receipt_vat WHERE receipt_id = ? ORDER BY vat_rate DESC',
    receiptId
  );
  return rows.map(toVatRow);
}

// Rozpisy DPH všetkých dokladov mesiaca naraz (pre export); kľúč je id dokladu.
export async function getVatRowsForMonth(companyId: number, month: string): Promise<Map<number, VatRow[]>> {
  const db = await getDb();
  const rows = await db.getAllAsync<VatRowRecord>(
    `SELECT v.* FROM receipt_vat v
     JOIN receipts r ON r.id = v.receipt_id
     WHERE r.company_id = ? AND substr(r.purchase_date, 1, 7) = ?
     ORDER BY v.receipt_id, v.vat_rate DESC`,
    companyId,
    month
  );
  const byReceipt = new Map<number, VatRow[]>();
  for (const row of rows) {
    byReceipt.set(row.receipt_id, [...(byReceipt.get(row.receipt_id) ?? []), toVatRow(row)]);
  }
  return byReceipt;
}

// Volá sa vnútri transakcie uloženia dokladu, preto dostáva už otvorené spojenie.
export async function replaceVatRows(db: SQLiteDatabase, receiptId: number, rows: VatRow[]): Promise<void> {
  await db.runAsync('DELETE FROM receipt_vat WHERE receipt_id = ?', receiptId);
  for (const row of rows) {
    await db.runAsync(
      'INSERT INTO receipt_vat (receipt_id, vat_rate, base_cents, vat_cents) VALUES (?, ?, ?, ?)',
      receiptId,
      row.rate,
      row.base_cents,
      row.vat_cents
    );
  }
}
