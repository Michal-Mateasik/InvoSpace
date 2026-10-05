import type { ReceiptWithCategory, VatRow } from '@/types';

// Export dokladov do XML pre import do Pohody (STORMWARE), formát dataPack verzia 2.0.
// Doklad z bločku sa v Pohode vytvorí ako výdavkový pokladničný doklad (voucher, expense).
// Schémy: https://www.stormware.sk/xml  (data.xsd, voucher.xsd, type.xsd)

export type PohodaConfig = {
  ico: string; // IČO firmy v Pohode
  cashAccount: string; // skratka pokladne v Pohode
  accounting: string; // predvolená predkontácia firmy v hlavičke dokladu (môže byť prázdna)
};

export type PohodaExport = {
  xml: string;
  fileName: string;
  receiptCount: number;
  // Upozornenia na doklady, ktoré sa nepodarilo exportovať úplne správne (chýba rozpis DPH a pod.).
  warnings: string[];
};

// Pohoda pracuje so sadzbami „základná / znížená / tretia“ a percentá k nim priradí podľa dátumu
// dokladu. My poznáme percentá: do 2024 20 % a 10 %, od 2025 23 %, 19 % a 5 %.
function pohodaRate(rate: number): 'none' | 'high' | 'low' | 'third' | null {
  switch (rate) {
    case 0:
      return 'none';
    case 23:
    case 20:
      return 'high';
    case 19:
    case 10:
      return 'low';
    case 5:
      return 'third';
    default:
      return null;
  }
}

// Sumy v XML majú desatinnú bodku a žiadne oddeľovače tisícov. 1250 -> "12.50"
function decimal(cents: number): string {
  const abs = Math.abs(cents);
  return `${cents < 0 ? '-' : ''}${Math.floor(abs / 100)}.${(abs % 100).toString().padStart(2, '0')}`;
}

// Do XML vkladáme len ASCII: znaky mimo ASCII (diakritika) idú ako číselné odkazy (&#x161;).
// Takýto súbor je platný pri akomkoľvek kódovaní a Pohoda ho prečíta rovnako ako súbor
// vo Windows-1250. Zároveň sa odstránia riadiace znaky, ktoré XML nepovoľuje.
function escapeXml(value: string): string {
  let out = '';
  for (const char of value) {
    const code = char.codePointAt(0) as number;
    if (char === '&') out += '&amp;';
    else if (char === '<') out += '&lt;';
    else if (char === '>') out += '&gt;';
    else if (char === '"') out += '&quot;';
    else if (code === 9 || code === 10 || code === 13 || (code >= 32 && code < 127)) out += char;
    else if (code >= 127 && !(code >= 0xd800 && code <= 0xdfff) && code !== 0xfffe && code !== 0xffff) {
      out += `&#x${code.toString(16).toUpperCase()};`;
    }
  }
  return out;
}

// Orezanie na maximálnu dĺžku poľa podľa schémy (inak by Pohoda doklad odmietla).
function limit(value: string, max: number): string {
  return Array.from(value).slice(0, max).join('');
}

const tag = (name: string, value: string) => `<${name}>${escapeXml(value)}</${name}>`;

function buildVoucher(
  receipt: ReceiptWithCategory,
  rows: VatRow[],
  config: PohodaConfig,
  warnings: string[]
): string {
  const label = receipt.internal_number ?? `ID ${receipt.id}`;
  const merchant = receipt.merchant_name?.trim() ?? '';
  const date = receipt.purchase_date.slice(0, 10);

  // Bez rozpisu DPH nevieme sadzbu; doklad ide ako bez DPH a používateľ je na to upozornený.
  let vatRows = rows;
  if (vatRows.length === 0) {
    warnings.push(`${label}: chýba rozpis DPH, doklad sa exportuje ako bez DPH.`);
    vatRows = [{ rate: 0, base_cents: receipt.amount_cents, vat_cents: 0 }];
  }

  const items = vatRows
    .map((row) => {
      let rate = pohodaRate(row.rate);
      if (rate === null) {
        warnings.push(`${label}: neznáma sadzba DPH ${row.rate} %, položka sa exportuje ako bez DPH.`);
        rate = 'none';
      }
      const suffix = vatRows.length > 1 ? ` (${row.rate === 0 ? 'bez DPH' : `${row.rate} %`})` : '';
      const text = limit(`${receipt.category_name ?? 'Nákup'} - ${merchant || 'bloček'}${suffix}`, 90);
      return [
        '<vch:voucherItem>',
        tag('vch:text', text),
        '<vch:quantity>1</vch:quantity>',
        '<vch:payVAT>false</vch:payVAT>',
        `<vch:rateVAT>${rate}</vch:rateVAT>`,
        '<vch:homeCurrency>',
        `<typ:unitPrice>${decimal(row.base_cents)}</typ:unitPrice>`,
        `<typ:priceVAT>${decimal(row.vat_cents)}</typ:priceVAT>`,
        '</vch:homeCurrency>',
        '</vch:voucherItem>',
      ].join('\n');
    })
    .join('\n');

  const header: string[] = [
    '<vch:voucherType>expense</vch:voucherType>',
    `<vch:cashAccount><typ:ids>${escapeXml(config.cashAccount)}</typ:ids></vch:cashAccount>`,
  ];
  // Interné číslo ide ako požadované číslo dokladu; číselný rad v Pohode musí mať rovnakú predponu.
  if (receipt.internal_number) {
    header.push(
      `<vch:number><typ:numberRequested>${escapeXml(limit(receipt.internal_number, 32))}</typ:numberRequested></vch:number>`
    );
  }
  if (receipt.receipt_number) {
    header.push(tag('vch:originalDocument', limit(receipt.receipt_number, 32)));
  }
  header.push(
    `<vch:date>${date}</vch:date>`,
    `<vch:datePayment>${date}</vch:datePayment>`,
    `<vch:dateTax>${date}</vch:dateTax>`
  );
  if (config.accounting) {
    header.push(`<vch:accounting><typ:ids>${escapeXml(config.accounting)}</typ:ids></vch:accounting>`);
  }
  // Text dokladu je určený na filtrovanie v Pohode, preto nesie presne predkontáciu kategórie
  // (nič iné), aby sa dalo filtrovať podľa nej. Ak ju kategória nemá, text je popis dokladu
  // (Pohoda text vyžaduje).
  const categoryAccounting = receipt.category_accounting?.trim();
  const fallbackText = `Bloček ${merchant}${receipt.receipt_number ? ` č. ${receipt.receipt_number}` : ''}`.trim();
  header.push(tag('vch:text', limit(categoryAccounting || fallbackText, 240)));

  if (merchant || receipt.merchant_ico) {
    const address = [
      merchant ? tag('typ:company', limit(merchant, 255)) : '',
      receipt.merchant_ico ? tag('typ:ico', limit(receipt.merchant_ico, 15)) : '',
    ].filter(Boolean);
    header.push(`<vch:partnerIdentity><typ:address>${address.join('')}</typ:address></vch:partnerIdentity>`);
  }
  if (receipt.note) header.push(tag('vch:note', receipt.note));
  header.push(tag('vch:intNote', `InvoSpace${receipt.ekasa_receipt_id ? `, eKasa: ${receipt.ekasa_receipt_id}` : ''}`));

  return [
    `<dat:dataPackItem version="2.0" id="R${receipt.id}">`,
    '<vch:voucher version="2.0">',
    '<vch:voucherHeader>',
    ...header,
    '</vch:voucherHeader>',
    '<vch:voucherDetail>',
    items,
    '</vch:voucherDetail>',
    '</vch:voucher>',
    '</dat:dataPackItem>',
  ].join('\n');
}

// `month` je napr. "2026-10". Doklady sa zoradia od najstaršieho.
export function buildPohodaXml(
  month: string,
  receipts: ReceiptWithCategory[],
  vatByReceipt: Map<number, VatRow[]>,
  config: PohodaConfig
): PohodaExport {
  const warnings: string[] = [];
  const sorted = [...receipts].sort(
    (a, b) => a.purchase_date.localeCompare(b.purchase_date) || a.id - b.id
  );
  const vouchers = sorted.map((r) => buildVoucher(r, vatByReceipt.get(r.id) ?? [], config, warnings));

  // id balíka je stále rovnaké pre ten istý mesiac: Pohoda podľa neho pozná už importované doklady
  // a pri opakovanom importe ich nezdvojí.
  const xml = [
    '<?xml version="1.0" encoding="Windows-1250"?>',
    `<dat:dataPack version="2.0" id="InvoSpace_${month}" ico="${escapeXml(config.ico)}" application="InvoSpace" note="Blocky ${month}"`,
    'xmlns:dat="http://www.stormware.cz/schema/version_2/data.xsd"',
    'xmlns:vch="http://www.stormware.cz/schema/version_2/voucher.xsd"',
    'xmlns:typ="http://www.stormware.cz/schema/version_2/type.xsd">',
    ...vouchers,
    '</dat:dataPack>',
    '',
  ].join('\n');

  return { xml, fileName: `InvoSpace_${month}.xml`, receiptCount: sorted.length, warnings };
}
