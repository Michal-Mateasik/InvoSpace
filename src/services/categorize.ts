import { getMerchantCategoryId, saveMerchantCategory } from '@/db/merchantCategories';

// Kľúč obchodu: IČO, ak ho máme, inak normalizovaný názov. Normalizácia (bez diakritiky,
// malé písmená, jedna medzera) zabezpečí, že „Tesco“, „TESCO “ a „tésco“ sú ten istý obchod.
export function getMerchantKey(ico: string | null, name: string | null): string | null {
  const cleanIco = ico?.replace(/\s/g, '');
  if (cleanIco) return cleanIco;

  const cleanName = name
    ?.normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
  return cleanName || null;
}

export async function suggestCategoryId(ico: string | null, name: string | null): Promise<number | null> {
  const key = getMerchantKey(ico, name);
  return key ? getMerchantCategoryId(key) : null;
}

export async function rememberCategory(
  ico: string | null,
  name: string | null,
  categoryId: number | null
): Promise<void> {
  const key = getMerchantKey(ico, name);
  if (key && categoryId !== null) await saveMerchantCategory(key, categoryId);
}
