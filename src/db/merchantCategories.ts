import { getDb } from './database';

export async function getMerchantCategoryId(merchantKey: string): Promise<number | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ category_id: number }>(
    'SELECT category_id FROM merchant_categories WHERE merchant_key = ?',
    merchantKey
  );
  return row?.category_id ?? null;
}

export async function saveMerchantCategory(merchantKey: string, categoryId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO merchant_categories (merchant_key, category_id) VALUES (?, ?)',
    merchantKey,
    categoryId
  );
}
