import type { Category } from '@/types';

import { getDb } from './database';

// Farby pre nové vlastné kategórie; pridelia sa postupne, aby sa dali odlíšiť.
const CUSTOM_COLORS = ['#00A6A6', '#3F51B5', '#795548', '#FF7043', '#26A69A', '#9C27B0', '#607D8B', '#C0CA33'];

// Doklady zmazanej kategórie sa presúvajú do tejto kategórie.
const FALLBACK_CATEGORY_NAME = 'Ostatné';

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDb();
  return db.getAllAsync<Category>('SELECT * FROM categories ORDER BY id');
}

export async function addCategory(name: string): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM categories');
  const color = CUSTOM_COLORS[(row?.count ?? 0) % CUSTOM_COLORS.length];
  await db.runAsync('INSERT INTO categories (name, color, is_default) VALUES (?, ?, 0)', name, color);
}

// Premenovať ide len vlastné kategórie (is_default = 0).
export async function renameCategory(id: number, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE categories SET name = ? WHERE id = ? AND is_default = 0', name, id);
}

// Predkontáciu môže mať aj predvolená kategória (premenovať sa nedá, ale predkontácia áno).
export async function setCategoryAccounting(id: number, accounting: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE categories SET pohoda_accounting = ? WHERE id = ?', accounting, id);
}

export async function deleteCategory(id: number): Promise<void> {
  const db = await getDb();
  // Všetko v jednej transakcii, aby po chybe nezostali doklady bez kategórie.
  await db.withTransactionAsync(async () => {
    const fallback = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM categories WHERE name = ?',
      FALLBACK_CATEGORY_NAME
    );
    if (!fallback) throw new Error(`Chýba kategória ${FALLBACK_CATEGORY_NAME}`);

    await db.runAsync('UPDATE receipts SET category_id = ? WHERE category_id = ?', fallback.id, id);
    // Zapamätané obchody ukazujúce na zmazanú kategóriu už nemajú zmysel.
    await db.runAsync('DELETE FROM merchant_categories WHERE category_id = ?', id);
    await db.runAsync('DELETE FROM categories WHERE id = ? AND is_default = 0', id);
  });
}
