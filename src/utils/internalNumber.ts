// Interné číslo dokladu = predpona + poradové číslo doplnené nulami zľava, napr. "26/V-" + 1 -> "26/V-001".

// width = minimálny počet číslic; 0 = bez núl (PD1, PD2, …).
export function formatInternalNumber(prefix: string, next: number, width: number): string {
  return `${prefix}${String(next).padStart(width, '0')}`;
}

// Počet číslic sa berie z toho, čo používateľ napísal: „001“ znamená 3 číslice, „7“ žiadne dopĺňanie.
export function widthFromText(text: string): number {
  const trimmed = text.trim();
  return /^0/.test(trimmed) ? trimmed.length : 0;
}

// Ak číslo začína predponou a zvyšok sú číslice, vráti poradové číslo (napr. 17 pre "26/V-017").
// Iný tvar (napr. "FA-7") vráti null.
export function parseUsedNumber(prefix: string, internalNumber: string): number | null {
  if (!internalNumber.startsWith(prefix)) return null;
  const digits = internalNumber.slice(prefix.length);
  return /^\d{1,9}$/.test(digits) ? Number(digits) : null;
}
