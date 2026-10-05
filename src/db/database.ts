import * as SQLite from 'expo-sqlite';

import { guessVatRate } from '@/utils/vat';

const DB_NAME = 'invospace.db';

const DEFAULT_CATEGORIES: { name: string; color: string }[] = [
  { name: 'Benzín', color: '#E4572E' },
  { name: 'Potraviny', color: '#4CAF50' },
  { name: 'Domácnosť', color: '#8E6CCF' },
  { name: 'Reštaurácie', color: '#F5A623' },
  { name: 'Zdravie', color: '#E91E63' },
  { name: 'Ostatné', color: '#8A8A8E' },
];

// Migrácie: prvok na indexe i upraví schému z verzie i na verziu i + 1.
// Nové zmeny schémy sa pridávajú na koniec poľa, nikdy sa nemenia staré.
const MIGRATIONS: ((db: SQLite.SQLiteDatabase) => Promise<void>)[] = [
  async (db) => {
    await db.execAsync(`
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchase_date TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        merchant_name TEXT,
        merchant_ico TEXT,
        category_id INTEGER REFERENCES categories(id),
        image_uri TEXT,
        ekasa_receipt_id TEXT,
        source TEXT NOT NULL CHECK (source IN ('manual', 'qr')),
        note TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE merchant_categories (
        merchant_key TEXT PRIMARY KEY,
        category_id INTEGER NOT NULL REFERENCES categories(id)
      );
    `);
    for (const category of DEFAULT_CATEGORIES) {
      await db.runAsync(
        'INSERT INTO categories (name, color, is_default) VALUES (?, ?, 1)',
        category.name,
        category.color
      );
    }
  },
  // Verzia 2: interné číslo dokladu (napr. PD1) a tabuľka nastavení pre číslovanie.
  async (db) => {
    await db.execAsync(`
      ALTER TABLE receipts ADD COLUMN internal_number TEXT;
      -- Jedinečné číslo; NULL (doklad bez čísla) môže byť viackrát.
      CREATE UNIQUE INDEX idx_receipts_internal_number ON receipts(internal_number);
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    // Už existujúcim dokladom doplníme čísla podľa poradia pridania.
    const existing = await db.getAllAsync<{ id: number }>('SELECT id FROM receipts ORDER BY created_at, id');
    for (let i = 0; i < existing.length; i++) {
      await db.runAsync('UPDATE receipts SET internal_number = ? WHERE id = ?', `PD${i + 1}`, existing[i].id);
    }
    await db.runAsync("INSERT INTO settings (key, value) VALUES ('internal_prefix', 'PD')");
    await db.runAsync("INSERT INTO settings (key, value) VALUES ('internal_next', ?)", String(existing.length + 1));
  },
  // Verzia 3: krátke číslo dokladu z bločku (receipt_number) oddelíme od dlhého identifikátora
  // z eKasa (ekasa_receipt_id). Čo používateľ doteraz zadal ručne ako „číslo dokladu“, presunieme.
  async (db) => {
    await db.execAsync(`
      ALTER TABLE receipts ADD COLUMN receipt_number TEXT;
      UPDATE receipts
        SET receipt_number = ekasa_receipt_id, ekasa_receipt_id = NULL
        WHERE source = 'manual' AND ekasa_receipt_id IS NOT NULL;
    `);
  },
  // Verzia 4: suma bez DPH v centoch. NULL = neznáma (staršie doklady, offline QR).
  async (db) => {
    await db.execAsync('ALTER TABLE receipts ADD COLUMN amount_net_cents INTEGER;');
  },
  // Verzia 5: rozpis DPH po sadzbách (jeden riadok na sadzbu). Pohoda potrebuje základ a DPH
  // zvlášť za každú sadzbu, jedna celková suma bez DPH nestačí.
  async (db) => {
    await db.execAsync(`
      CREATE TABLE receipt_vat (
        receipt_id INTEGER NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
        vat_rate INTEGER NOT NULL,
        base_cents INTEGER NOT NULL,
        vat_cents INTEGER NOT NULL,
        PRIMARY KEY (receipt_id, vat_rate)
      );
    `);
    // Staršie doklady so známou sumou bez DPH: sadzbu odhadneme z pomeru DPH a základu.
    const known = await db.getAllAsync<{ id: number; amount_cents: number; amount_net_cents: number }>(
      'SELECT id, amount_cents, amount_net_cents FROM receipts WHERE amount_net_cents IS NOT NULL'
    );
    for (const receipt of known) {
      const vat = receipt.amount_cents - receipt.amount_net_cents;
      const rate = guessVatRate(receipt.amount_net_cents, vat);
      if (rate === null) continue; // sadzbu sa nepodarilo určiť, doklad ostane bez rozpisu
      await db.runAsync(
        'INSERT INTO receipt_vat (receipt_id, vat_rate, base_cents, vat_cents) VALUES (?, ?, ?, ?)',
        receipt.id,
        rate,
        receipt.amount_net_cents,
        vat
      );
    }
  },
  // Verzia 6: firmy. Bločky patria vždy jednej firme; firma nesie aj nastavenia exportu do Pohody
  // a číslovanie dokladov (predtým boli globálne v tabuľke settings).
  async (db) => {
    await db.execAsync(`
      CREATE TABLE companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        ico TEXT NOT NULL,
        dic TEXT,
        ic_dph TEXT,
        address TEXT,
        pohoda_cash_account TEXT NOT NULL DEFAULT '',
        pohoda_accounting TEXT NOT NULL DEFAULT '',
        internal_prefix TEXT NOT NULL DEFAULT 'PD',
        internal_next INTEGER NOT NULL DEFAULT 1
      );
      ALTER TABLE receipts ADD COLUMN company_id INTEGER REFERENCES companies(id);
      -- Interné číslo je jedinečné v rámci firmy (každá firma má vlastný rad PD1, PD2, …).
      DROP INDEX idx_receipts_internal_number;
      CREATE UNIQUE INDEX idx_receipts_company_internal_number ON receipts(company_id, internal_number);
    `);

    // Doterajšie doklady a nastavenia presunieme do jednej firmy, aby sa nič nestratilo.
    const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
    const old = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const receiptCount = (await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM receipts'))?.count ?? 0;
    if (receiptCount > 0 || old.pohoda_ico) {
      const result = await db.runAsync(
        `INSERT INTO companies (name, ico, pohoda_cash_account, pohoda_accounting, internal_prefix, internal_next)
         VALUES (?, ?, ?, ?, ?, ?)`,
        'Moja firma',
        old.pohoda_ico ?? '',
        old.pohoda_cash_account ?? '',
        old.pohoda_accounting ?? '',
        old.internal_prefix ?? 'PD',
        Number(old.internal_next ?? 1)
      );
      await db.runAsync('UPDATE receipts SET company_id = ?', result.lastInsertRowId);
      await db.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('active_company_id', ?)", String(result.lastInsertRowId));
    }
    await db.execAsync(
      "DELETE FROM settings WHERE key IN ('internal_prefix', 'internal_next', 'pohoda_ico', 'pohoda_cash_account', 'pohoda_accounting')"
    );
  },
  // Verzia 7: minimálny počet číslic interného čísla (nuly na začiatku, napr. 3 pre 26/V-001).
  // 0 = bez dopĺňania núl (PD1, PD2, …).
  async (db) => {
    await db.execAsync('ALTER TABLE companies ADD COLUMN internal_width INTEGER NOT NULL DEFAULT 0;');
  },
  // Verzia 8: predkontácia z Pohody pri kategórii. Export ju pošle pri položke dokladu danej kategórie.
  // Prázdny reťazec = kategória predkontáciu nemá (použije sa predkontácia firmy, ak je).
  async (db) => {
    await db.execAsync("ALTER TABLE categories ADD COLUMN pohoda_accounting TEXT NOT NULL DEFAULT '';");
  },
];

// Aktuálna verzia schémy (počet migrácií). Podľa nej sa pri obnove zálohy pozná, či záloha nie je novšia.
export const SCHEMA_VERSION = MIGRATIONS.length;

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  for (let version = currentVersion; version < MIGRATIONS.length; version++) {
    // Migrácia a zápis novej verzie sú v jednej transakcii, aby sa nikdy nezapísala len polovica.
    await db.withTransactionAsync(async () => {
      await MIGRATIONS[version](db);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
  return db;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Databáza sa otvorí a zmigruje len raz; ostatné volania dostanú rovnaké spojenie.
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate().catch((error) => {
      dbPromise = null; // pri chybe sa pri ďalšom volaní skúsi znova
      throw error;
    });
  }
  return dbPromise;
}
