import { findReceiptByEkasaId } from '@/db/receipts';
import type { VatRow } from '@/types';
import { toIsoDate } from '@/utils/format';

// Všetko okolo eKasa je na jednom mieste. Ak by sa API zmenilo alebo vypínalo,
// stačí upraviť tento súbor (napr. nastaviť EKASA_LOOKUP_ENABLED na false).
const EKASA_LOOKUP_ENABLED = true;
const EKASA_URL = 'https://ekasa.financnasprava.sk/mdu/api/v1/opd/receipt/find';
const TIMEOUT_MS = 10_000;

// Údaje, ktorými predvyplníme formulár. Čokoľvek môže chýbať; používateľ doplní ručne.
export type ReceiptPrefill = {
  ekasaId: string | null;
  receiptNumber: string | null;
  amountCents: number | null; // s DPH
  vatRows: VatRow[]; // rozpis DPH po sadzbách (základ a DPH); prázdny, ak ho nepoznáme
  date: string | null; // ISO RRRR-MM-DD
  merchant: string | null;
  ico: string | null;
};

export type ScanOutcome =
  | { kind: 'unknown' }
  | { kind: 'duplicate'; receiptId: number; internalNumber: string | null; companyName: string | null }
  | { kind: 'prefill'; prefill: ReceiptPrefill; notice: string };

type ParsedQr =
  | { type: 'online'; receiptId: string }
  | {
      type: 'offline';
      okp: string;
      receiptNumber: string;
      amountCents: number | null;
      date: string | null;
    }
  | { type: 'unknown' };

// ---------- Parsovanie QR ----------

// Online doklad: identifikátor O-<32 hex znakov> (rovnaký tvar má aj V- pre doklady z webu).
const ONLINE_ID_PATTERN = /[A-Z]-[0-9A-F]{32}/i;

export function parseQr(raw: string): ParsedQr {
  const text = raw.trim();

  const online = text.match(ONLINE_ID_PATTERN);
  if (online) return { type: 'online', receiptId: online[0].toUpperCase() };

  // Offline doklad: OKP:kód pokladnice:dátum a čas:poradové číslo:suma
  const parts = text.split(':');
  if (parts.length === 5 && /^\d{12}$/.test(parts[2])) {
    const amount = Number(parts[4]);
    return {
      type: 'offline',
      okp: parts[0],
      receiptNumber: parts[3],
      amountCents: Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : null,
      date: parseOfflineDate(parts[2]),
    };
  }
  return { type: 'unknown' };
}

// Dátum v offline kóde má 12 číslic. V oficiálnych zdrojoch, ktoré sme našli, nie je poradie
// jednoznačne potvrdené, preto skúšame oba tvary a berieme ten, ktorý dáva reálny dátum
// od štartu eKasa (2019) po dnes. Používateľ aj tak vidí dátum vo formulári a môže ho opraviť.
function parseOfflineDate(digits: string): string | null {
  const pair = (start: number) => Number(digits.slice(start, start + 2));
  const candidates = [
    { year: pair(0), month: pair(2), day: pair(4) }, // rrMMdd
    { year: pair(4), month: pair(2), day: pair(0) }, // ddMMrr
  ];
  const hour = pair(6);
  const minute = pair(8);
  const second = pair(10);
  if (hour > 23 || minute > 59 || second > 59) return null;

  const now = new Date();
  for (const { year, month, day } of candidates) {
    const date = new Date(2000 + year, month - 1, day);
    const isRealDate =
      date.getFullYear() === 2000 + year && date.getMonth() === month - 1 && date.getDate() === day;
    if (isRealDate && date.getFullYear() >= 2019 && date <= now) return toIsoDate(date);
  }
  return null;
}

// ---------- Dopyt na eKasa ----------

type FailureReason = 'network' | 'timeout' | 'not_found' | 'rate_limited' | 'server';

class EkasaError extends Error {
  reason: FailureReason;

  constructor(reason: FailureReason) {
    super(reason);
    this.reason = reason;
  }
}

const FAILURE_MESSAGES: Record<FailureReason, string> = {
  network: 'Nepodarilo sa spojiť s eKasa. Skontroluj pripojenie na internet.',
  timeout: 'eKasa neodpovedala včas. Skús to neskôr.',
  not_found: 'Doklad sa v eKasa nenašiel (čerstvý doklad sa tam môže objaviť až po chvíli).',
  rate_limited: 'eKasa momentálne odmieta ďalšie dopyty. Skús to o chvíľu.',
  server: 'eKasa vrátila neočakávanú odpoveď.',
};

// Časť odpovede, ktorú používame; API vracia oveľa viac polí.
type EkasaApiReceipt = {
  receiptId?: string;
  receiptNumber?: string | number | null;
  issueDate?: string; // "07.10.2020 16:57:12"
  createDate?: string;
  totalPrice?: string | number;
  vatAmountBasic?: string | number | null;
  vatAmountReduced?: string | number | null;
  vatSummary?: { vatBase?: string | number; vatAmount?: string | number; vat?: { vatRate?: string | number } }[];
  taxBaseBasic?: string | number | null;
  taxBaseReduced?: string | number | null;
  vatRateBasic?: string | number | null;
  vatRateReduced?: string | number | null;
  ico?: string;
  organization?: { name?: string; ico?: string };
};

async function lookupReceipt(receiptId: string): Promise<EkasaApiReceipt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(EKASA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiptId }),
      signal: controller.signal,
    });
    if (response.status === 429) throw new EkasaError('rate_limited');
    if (!response.ok) throw new EkasaError('server');

    const json = await response.json().catch(() => {
      throw new EkasaError('server');
    });
    // Neexistujúci doklad API nevracia ako chybu, ale ako `receipt: null`.
    if (!json?.receipt) throw new EkasaError('not_found');
    return json.receipt as EkasaApiReceipt;
  } catch (error) {
    if (error instanceof EkasaError) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw new EkasaError('timeout');
    throw new EkasaError('network');
  } finally {
    clearTimeout(timer);
  }
}

// "07.10.2020 16:57:12" -> "2020-10-07"
function eKasaDateToIso(value: string | undefined): string | null {
  const match = value?.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

const toCents = (value: string | number | null | undefined) => Math.round(Number(value) * 100);

// Rozpis DPH po sadzbách. Zdrojom je `vatSummary` (riadok pre každú použitú sadzbu, aj novšie);
// staré polia taxBase*/vatAmount* poznajú len dve sadzby, preto sú len záloha.
export function buildVatRows(api: EkasaApiReceipt, totalCents: number): VatRow[] {
  const rows = new Map<number, VatRow>();
  const add = (rate: number, baseCents: number, vatCents: number) => {
    if (!Number.isFinite(rate) || !Number.isFinite(baseCents) || !Number.isFinite(vatCents)) return;
    const current = rows.get(rate) ?? { rate, base_cents: 0, vat_cents: 0 };
    rows.set(rate, { rate, base_cents: current.base_cents + baseCents, vat_cents: current.vat_cents + vatCents });
  };

  if (Array.isArray(api.vatSummary) && api.vatSummary.length > 0) {
    for (const row of api.vatSummary) {
      add(Math.round(Number(row.vat?.vatRate)), toCents(row.vatBase), toCents(row.vatAmount));
    }
  } else {
    add(Math.round(Number(api.vatRateBasic)), toCents(api.taxBaseBasic ?? 0), toCents(api.vatAmountBasic ?? 0));
    add(Math.round(Number(api.vatRateReduced)), toCents(api.taxBaseReduced ?? 0), toCents(api.vatAmountReduced ?? 0));
  }

  const result = [...rows.values()].filter((r) => r.base_cents !== 0 || r.vat_cents !== 0);
  if (result.length === 0) return [];

  // Súčet riadkov má dať celkovú sumu. Rozdiel pár centov je zaokrúhlenie (pripočítame k najväčšiemu
  // základu); väčší kladný rozdiel sú položky bez DPH (pridáme riadok 0 %). Inak rozpisu neveríme.
  const difference = totalCents - result.reduce((sum, r) => sum + r.base_cents + r.vat_cents, 0);
  if (Math.abs(difference) <= 2) {
    const largest = result.reduce((best, r) => (r.base_cents > best.base_cents ? r : best));
    largest.base_cents += difference;
  } else if (difference > 0) {
    const zero = result.find((r) => r.rate === 0);
    if (zero) zero.base_cents += difference;
    else result.push({ rate: 0, base_cents: difference, vat_cents: 0 });
  } else {
    return [];
  }
  return result.sort((a, b) => b.rate - a.rate);
}

function toPrefill(receiptId: string, api: EkasaApiReceipt): ReceiptPrefill {
  const total = Number(api.totalPrice);
  const totalCents = Number.isFinite(total) && total > 0 ? Math.round(total * 100) : null;
  return {
    ekasaId: api.receiptId ?? receiptId,
    receiptNumber: api.receiptNumber != null ? String(api.receiptNumber) : null,
    amountCents: totalCents,
    vatRows: totalCents !== null ? buildVatRows(api, totalCents) : [],
    date: eKasaDateToIso(api.issueDate ?? api.createDate),
    merchant: api.organization?.name?.trim() || null,
    ico: api.organization?.ico || api.ico || null,
  };
}

// ---------- Hlavný vstup: obsah QR -> údaje na predvyplnenie ----------

const EMPTY_PREFILL: ReceiptPrefill = {
  ekasaId: null,
  receiptNumber: null,
  amountCents: null,
  vatRows: [],
  date: null,
  merchant: null,
  ico: null,
};

export async function resolveScan(raw: string): Promise<ScanOutcome> {
  const qr = parseQr(raw);
  if (qr.type === 'unknown') return { kind: 'unknown' };

  const ekasaId = qr.type === 'online' ? qr.receiptId : qr.okp;
  // Ten istý bloček nechceme uložiť dvakrát; skontrolujeme to ešte pred dopytom do siete.
  const existing = await findReceiptByEkasaId(ekasaId);
  if (existing) {
    return {
      kind: 'duplicate',
      receiptId: existing.id,
      internalNumber: existing.internal_number,
      companyName: existing.company_name,
    };
  }

  if (qr.type === 'offline') {
    return {
      kind: 'prefill',
      prefill: {
        ...EMPTY_PREFILL,
        ekasaId,
        receiptNumber: qr.receiptNumber,
        amountCents: qr.amountCents,
        date: qr.date,
      },
      notice: 'Ide o offline doklad, preto sa načítala len suma a dátum. Doplň dodávateľa.',
    };
  }

  const fallback: ReceiptPrefill = { ...EMPTY_PREFILL, ekasaId };
  if (!EKASA_LOOKUP_ENABLED) {
    return { kind: 'prefill', prefill: fallback, notice: 'Vyhľadávanie v eKasa je vypnuté. Doplň údaje ručne.' };
  }
  try {
    const receipt = await lookupReceipt(qr.receiptId);
    return {
      kind: 'prefill',
      prefill: toPrefill(qr.receiptId, receipt),
      notice: 'Údaje sa načítali z eKasa. Skontroluj ich pred uložením.',
    };
  } catch (error) {
    const reason = error instanceof EkasaError ? error.reason : 'network';
    return {
      kind: 'prefill',
      prefill: fallback,
      notice: `${FAILURE_MESSAGES[reason]} Doplň údaje ručne.`,
    };
  }
}
