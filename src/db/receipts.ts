import type { ReceiptInput, ReceiptWithCategory, VatRow } from '@/types';

import { getDb } from './database';
import { advanceCounterAfter } from './numbering';
import { replaceVatRows } from './vat';

const SELECT_WITH_CATEGORY = `
  SELECT r.*, c.name AS category_name, c.color AS category_color, c.pohoda_accounting AS category_accounting
  FROM receipts r
  LEFT JOIN categories c ON c.id = r.category_id
`;

export type ReceiptFilter = {
  companyId: number;
  month: string | null; // "2026-10"
  categoryId: number | null;
};

// Najnovšie hore; pri rovnakom dátume rozhoduje poradie pridania.
// Doklady sú vždy len jednej firmy.
export async function getReceipts(filter: ReceiptFilter): Promise<ReceiptWithCategory[]> {
  const db = await getDb();
  const conditions: string[] = ['r.company_id = ?'];
  const params: (string | number)[] = [filter.companyId];
  if (filter.month) {
    conditions.push('substr(r.purchase_date, 1, 7) = ?');
    params.push(filter.month);
  }
  if (filter.categoryId !== null) {
    conditions.push('r.category_id = ?');
    params.push(filter.categoryId);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  return db.getAllAsync<ReceiptWithCategory>(
    `${SELECT_WITH_CATEGORY} ${where} ORDER BY r.purchase_date DESC, r.id DESC`,
    params
  );
}

// Mesiace, v ktorých existuje aspoň jeden doklad (najnovší prvý), napr. ["2026-10", "2026-09"].
export async function getReceiptMonths(companyId: number): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ month: string }>(
    `SELECT DISTINCT substr(purchase_date, 1, 7) AS month FROM receipts
     WHERE company_id = ? ORDER BY month DESC`,
    companyId
  );
  return rows.map((row) => row.month);
}

export async function getReceipt(id: number): Promise<ReceiptWithCategory | null> {
  const db = await getDb();
  return db.getFirstAsync<ReceiptWithCategory>(`${SELECT_WITH_CATEGORY} WHERE r.id = ?`, id);
}

// Slúži na odhalenie duplicitného skenu toho istého bločku. Hľadá cez všetky firmy,
// lebo jeden bloček nemá byť uložený dvakrát ani pri inej firme.
export type ExistingReceipt = { id: number; internal_number: string | null; company_name: string | null };

export async function findReceiptByEkasaId(ekasaId: string): Promise<ExistingReceipt | null> {
  const db = await getDb();
  return db.getFirstAsync<ExistingReceipt>(
    `SELECT r.id, r.internal_number, c.name AS company_name
     FROM receipts r LEFT JOIN companies c ON c.id = r.company_id
     WHERE r.ekasa_receipt_id = ?`,
    ekasaId
  );
}

export async function insertReceipt(input: ReceiptInput, vatRows: VatRow[]): Promise<number> {
  const db = await getDb();
  let id = 0;
  // Zápis dokladu a posunutie počítadla internej číslovky musia prejsť spolu alebo vôbec.
  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO receipts
        (company_id, purchase_date, amount_cents, amount_net_cents, merchant_name, merchant_ico, category_id,
         image_uri, ekasa_receipt_id, receipt_number, internal_number, source, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      input.company_id,
      input.purchase_date,
      input.amount_cents,
      input.amount_net_cents,
      input.merchant_name,
      input.merchant_ico,
      input.category_id,
      input.image_uri,
      input.ekasa_receipt_id,
      input.receipt_number,
      input.internal_number,
      input.source,
      input.note,
      new Date().toISOString()
    );
    id = result.lastInsertRowId;
    await replaceVatRows(db, id, vatRows);
    await advanceCounterAfter(db, input.company_id, input.internal_number);
  });
  return id;
}

// Pri úprave sa menia len polia, ktoré používateľ vidí vo formulári.
export type ReceiptUpdate = Pick<
  ReceiptInput,
  | 'purchase_date'
  | 'amount_cents'
  | 'amount_net_cents'
  | 'merchant_name'
  | 'category_id'
  | 'image_uri'
  | 'receipt_number'
  | 'internal_number'
  | 'note'
>;

export async function updateReceipt(id: number, update: ReceiptUpdate, vatRows: VatRow[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE receipts
       SET purchase_date = ?, amount_cents = ?, amount_net_cents = ?, merchant_name = ?,
           category_id = ?, image_uri = ?, receipt_number = ?, internal_number = ?, note = ?
       WHERE id = ?`,
      update.purchase_date,
      update.amount_cents,
      update.amount_net_cents,
      update.merchant_name,
      update.category_id,
      update.image_uri,
      update.receipt_number,
      update.internal_number,
      update.note,
      id
    );
    await replaceVatRows(db, id, vatRows);
    // Počítadlo patrí firme, ku ktorej doklad už je priradený.
    const owner = await db.getFirstAsync<{ company_id: number }>('SELECT company_id FROM receipts WHERE id = ?', id);
    if (owner) await advanceCounterAfter(db, owner.company_id, update.internal_number);
  });
}

export async function deleteReceipt(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM receipts WHERE id = ?', id);
}
