// Sumy sa v celej aplikácii držia v centoch (celé čísla), aby sa nekumulovali chyby desatinných čísel.

// 1250 -> "12,50 €"
export function formatAmount(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const rest = (abs % 100).toString().padStart(2, '0');
  return `${sign}${euros},${rest} €`;
}

// "12,5" alebo "12.50" -> 1250; neplatný vstup vráti null.
export function parseAmountToCents(text: string): number | null {
  const match = text.trim().match(/^(\d{1,7})(?:[.,](\d{1,2}))?$/);
  if (!match) return null;
  const euros = Number(match[1]);
  const cents = Number((match[2] ?? '').padEnd(2, '0'));
  const total = euros * 100 + cents;
  return total > 0 ? total : null;
}

// 1250 -> "12,50" (do textového poľa pri úprave)
export function centsToInput(cents: number): string {
  return `${Math.floor(cents / 100)},${(cents % 100).toString().padStart(2, '0')}`;
}

// "2026-10-03" -> "3. 10. 2026"
export function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return `${day}. ${month}. ${year}`;
}

const MONTH_NAMES = [
  'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
  'Júl', 'August', 'September', 'Október', 'November', 'December',
];

const MONTH_SHORT_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Máj', 'Jún', 'Júl', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

// "2026-10" -> "Okt"
export function formatMonthShort(month: string): string {
  return MONTH_SHORT_NAMES[Number(month.split('-')[1]) - 1];
}

// "2026-10" -> "Október 2026"
export function formatMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return `${MONTH_NAMES[monthNumber - 1]} ${year}`;
}

// Aktuálny mesiac podľa lokálneho času, napr. "2026-10".
export function currentMonth(): string {
  return toIsoDate(new Date()).slice(0, 7);
}

// shiftMonth("2026-01", -1) -> "2025-12"
export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 1 + delta, 1);
  return toIsoDate(date).slice(0, 7);
}

// Dátum ukladáme podľa lokálneho času; toISOString() by ho posunul do UTC a zmenil by deň.
export function toIsoDate(date: Date): string {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function fromIsoDate(iso: string): Date {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}
