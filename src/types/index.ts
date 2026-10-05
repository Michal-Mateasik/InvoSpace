export type Category = {
  id: number;
  name: string;
  color: string;
  is_default: number;
  pohoda_accounting: string; // predkontácia v Pohode pre položky tejto kategórie; '' = žiadna
};

// Firma, pre ktorú sa evidujú bločky. Každá má vlastné nastavenia exportu aj číslovania dokladov.
export type Company = {
  id: number;
  name: string;
  ico: string;
  dic: string | null;
  ic_dph: string | null;
  address: string | null;
  pohoda_cash_account: string; // skratka pokladne v Pohode (napr. HP)
  pohoda_accounting: string; // predkontácia v Pohode (nepovinné, môže byť prázdna)
  internal_prefix: string; // predpona interného čísla, napr. PD
  internal_next: number; // číslo, ktoré dostane ďalší doklad
  internal_width: number; // minimálny počet číslic (doplnenie nulami zľava); 0 = bez núl
};

export type CompanyInput = Omit<Company, 'id'>;

export type ReceiptSource = 'manual' | 'qr';

// Riadok z tabuľky receipts (názvy stĺpcov ostávajú ako v databáze).
export type Receipt = {
  id: number;
  company_id: number;
  purchase_date: string; // ISO 8601, napr. 2026-10-03
  amount_cents: number; // suma s DPH
  amount_net_cents: number | null; // suma bez DPH; null, ak ju nepoznáme
  merchant_name: string | null;
  merchant_ico: string | null;
  category_id: number | null;
  image_uri: string | null;
  ekasa_receipt_id: string | null; // dlhý identifikátor z QR kódu (online O-…, offline OKP)
  receipt_number: string | null; // krátke číslo dokladu z bločku (z eKasa alebo zadané ručne)
  internal_number: string | null; // naše interné číslo, napr. PD1
  source: ReceiptSource;
  note: string | null;
  created_at: string;
};

// Jeden riadok rozpisu DPH: základ a DPH za jednu sadzbu (v %; 0 = bez DPH).
export type VatRow = {
  rate: number;
  base_cents: number;
  vat_cents: number;
};

// Doklad spojený s kategóriou, aby sa v zozname nemuselo dopytovať po jednom.
export type ReceiptWithCategory = Receipt & {
  category_name: string | null;
  category_color: string | null;
  category_accounting: string | null; // predkontácia kategórie dokladu (pre export)
};

// Údaje, ktoré zadáva používateľ; id a created_at doplní databáza/kód.
export type ReceiptInput = Omit<Receipt, 'id' | 'created_at'>;
