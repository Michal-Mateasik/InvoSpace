import { getDb } from './database';

export type CategoryTotal = {
  category_id: number | null;
  name: string;
  color: string;
  total_cents: number;
  receipt_count: number;
};

export type MonthTotal = {
  month: string; // "2026-10"
  total_cents: number;
};

// Súčty po mesiacoch pre celý rok; mesiace bez dokladov v poli nie sú (doplní ich obrazovka).
export async function getMonthlyTotals(companyId: number, year: string): Promise<MonthTotal[]> {
  const db = await getDb();
  return db.getAllAsync<MonthTotal>(
    `SELECT substr(purchase_date, 1, 7) AS month, SUM(amount_cents) AS total_cents
     FROM receipts
     WHERE company_id = ? AND substr(purchase_date, 1, 4) = ?
     GROUP BY month
     ORDER BY month`,
    companyId,
    year
  );
}

export type MonthSummary = {
  totalCents: number; // súčet s DPH
  receiptCount: number;
  netCents: number; // súčet bez DPH len z dokladov, kde je uvedená
  netKnownCount: number; // z koľkých dokladov je suma bez DPH známa
  categories: CategoryTotal[]; // od najvyššej sumy
};

// Obdobie je mesiac ("2026-10") alebo celý rok ("2026"). Porovnáva sa začiatok dátumu, rovnako
// ako filter v zozname dokladov, takže súčty v prehľade sedia s tým, čo používateľ vidí v zozname.
export async function getPeriodSummary(companyId: number, period: string): Promise<MonthSummary> {
  const db = await getDb();
  const length = period.length;

  const categories = await db.getAllAsync<CategoryTotal>(
    `SELECT r.category_id AS category_id,
            COALESCE(c.name, 'Bez kategórie') AS name,
            COALESCE(c.color, '#8A8A8E') AS color,
            SUM(r.amount_cents) AS total_cents,
            COUNT(*) AS receipt_count
     FROM receipts r
     LEFT JOIN categories c ON c.id = r.category_id
     WHERE r.company_id = ? AND substr(r.purchase_date, 1, ?) = ?
     GROUP BY r.category_id
     ORDER BY total_cents DESC`,
    companyId,
    length,
    period
  );

  const net = await db.getFirstAsync<{ net_cents: number | null; net_count: number }>(
    `SELECT SUM(amount_net_cents) AS net_cents, COUNT(amount_net_cents) AS net_count
     FROM receipts
     WHERE company_id = ? AND substr(purchase_date, 1, ?) = ?`,
    companyId,
    length,
    period
  );

  return {
    totalCents: categories.reduce((sum, c) => sum + c.total_cents, 0),
    receiptCount: categories.reduce((sum, c) => sum + c.receipt_count, 0),
    netCents: net?.net_cents ?? 0,
    netKnownCount: net?.net_count ?? 0,
    categories,
  };
}
