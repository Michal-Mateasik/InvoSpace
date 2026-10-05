import type { Company, CompanyInput } from '@/types';

import { getDb } from './database';

export async function getCompanies(): Promise<Company[]> {
  const db = await getDb();
  return db.getAllAsync<Company>('SELECT * FROM companies ORDER BY name COLLATE NOCASE');
}

export async function getCompany(id: number): Promise<Company | null> {
  const db = await getDb();
  return db.getFirstAsync<Company>('SELECT * FROM companies WHERE id = ?', id);
}

export async function insertCompany(input: CompanyInput): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO companies
      (name, ico, dic, ic_dph, address, pohoda_cash_account, pohoda_accounting,
       internal_prefix, internal_next, internal_width)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.name,
    input.ico,
    input.dic,
    input.ic_dph,
    input.address,
    input.pohoda_cash_account,
    input.pohoda_accounting,
    input.internal_prefix,
    input.internal_next,
    input.internal_width
  );
  return result.lastInsertRowId;
}

export async function updateCompany(id: number, input: CompanyInput): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE companies
     SET name = ?, ico = ?, dic = ?, ic_dph = ?, address = ?,
         pohoda_cash_account = ?, pohoda_accounting = ?, internal_prefix = ?, internal_next = ?,
         internal_width = ?
     WHERE id = ?`,
    input.name,
    input.ico,
    input.dic,
    input.ic_dph,
    input.address,
    input.pohoda_cash_account,
    input.pohoda_accounting,
    input.internal_prefix,
    input.internal_next,
    input.internal_width,
    id
  );
}

export async function countCompanyReceipts(companyId: number): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM receipts WHERE company_id = ?',
    companyId
  );
  return row?.count ?? 0;
}

// Firma s dokladmi sa nemaže (cudzí kľúč to ani nedovolí); obrazovka to kontroluje vopred.
export async function deleteCompany(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM companies WHERE id = ?', id);
}

// Naposledy zvolená firma sa pamätá, aby sa pri ďalšom spustení nemuselo vyberať znova.
export async function getActiveCompanyId(): Promise<number | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'active_company_id'");
  return row ? Number(row.value) : null;
}

export async function setActiveCompanyId(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('active_company_id', ?)", String(id));
}
