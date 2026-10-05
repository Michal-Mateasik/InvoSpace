import type { VatRow } from '@/types';

import { parseAmountToCents } from './format';

// Sadzby DPH na Slovensku: od 1. 1. 2025 je základná 23 %, znížená 19 % a 5 %,
// pred tým 20 % a 10 %. Ponúkame tie, ktoré platili v deň nákupu.
export function ratesForDate(isoDate: string): number[] {
  return isoDate >= '2025-01-01' ? [23, 19, 5, 0] : [20, 10, 0];
}

// Zo sumy s DPH vypočíta základ a DPH pre jednu sadzbu (DPH sa zaokrúhli na centy).
export function splitGross(grossCents: number, rate: number, baseCents?: number): VatRow {
  const base = baseCents ?? grossCents - Math.round((grossCents * rate) / (100 + rate));
  return { rate, base_cents: base, vat_cents: grossCents - base };
}

// Odhad sadzby DPH (v %) z pomeru DPH k základu. Pri malých sumách by zaokrúhlenie
// na centy výsledok skreslilo, preto sa pod 1 € nehádže.
export function guessVatRate(baseCents: number, vatCents: number): number | null {
  if (vatCents === 0) return 0;
  if (baseCents < 100 || vatCents < 0) return null;
  const percent = (vatCents / baseCents) * 100;
  const known = [5, 10, 19, 20, 23];
  const nearest = known.reduce((best, r) => (Math.abs(r - percent) < Math.abs(best - percent) ? r : best));
  return Math.abs(nearest - percent) <= 1 ? nearest : null;
}

export type VatInput = {
  grossCents: number;
  netText: string; // ručne zadaná suma bez DPH (môže byť prázdna)
  rate: number | null; // zvolená sadzba
  fixedRows: VatRow[] | null; // rozpis z eKasa s viacerými sadzbami; nemení sa
};

export type VatResult = { rows: VatRow[]; netCents: number | null; error?: string };

// Zo vstupov formulára zostaví rozpis DPH, ktorý sa uloží k dokladu.
export function computeVatRows({ grossCents, netText, rate, fixedRows }: VatInput): VatResult {
  if (fixedRows) {
    const sum = fixedRows.reduce((total, r) => total + r.base_cents + r.vat_cents, 0);
    if (sum !== grossCents) {
      return {
        rows: [],
        netCents: null,
        error: `Suma s DPH nesedí s rozpisom DPH z eKasa (ten dáva spolu ${(sum / 100).toFixed(2).replace('.', ',')} €). Oprav sumu.`,
      };
    }
    return { rows: fixedRows, netCents: fixedRows.reduce((total, r) => total + r.base_cents, 0) };
  }

  let typedNet: number | null = null;
  if (netText.trim()) {
    typedNet = parseAmountToCents(netText);
    if (typedNet === null || typedNet > grossCents) {
      return { rows: [], netCents: null, error: 'Zadaj sumu bez DPH, ktorá nie je väčšia ako suma s DPH.' };
    }
  }

  if (rate === 0) return { rows: [splitGross(grossCents, 0, grossCents)], netCents: grossCents };
  if (rate !== null) {
    const row = splitGross(grossCents, rate, typedNet ?? undefined);
    return { rows: [row], netCents: row.base_cents };
  }
  if (typedNet !== null) {
    // Sadzba nie je zvolená; skúsime ju uhádnuť, inak ostane doklad bez rozpisu.
    const guessed = guessVatRate(typedNet, grossCents - typedNet);
    return {
      rows: guessed === null ? [] : [splitGross(grossCents, guessed, typedNet)],
      netCents: typedNet,
    };
  }
  return { rows: [], netCents: null };
}
