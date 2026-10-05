import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getActiveCompanyId, getCompanies, setActiveCompanyId } from '@/db/companies';
import type { Company } from '@/types';

type CompanyContextValue = {
  companies: Company[];
  active: Company | null; // firma, pre ktorú sa práve evidujú bločky
  loading: boolean;
  error: string | null; // napr. databázu sa nepodarilo otvoriť
  selectCompany: (id: number) => Promise<void>;
  reload: () => Promise<void>;
};

const CompanyContext = createContext<CompanyContextValue | null>(null);

// Drží zoznam firiem a aktuálne zvolenú firmu pre celú aplikáciu.
export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [list, storedId] = await Promise.all([getCompanies(), getActiveCompanyId()]);
      setCompanies(list);
      // Ak je firma jediná, nemá zmysel pýtať sa, ktorú použiť.
      const stored = list.find((c) => c.id === storedId);
      setActiveId(stored ? stored.id : list.length === 1 ? list[0].id : null);
      setError(null);
    } catch (e) {
      console.error(e);
      setError('Údaje aplikácie sa nepodarilo načítať. Skontroluj voľné miesto v telefóne a skús to znova.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const selectCompany = useCallback(async (id: number) => {
    await setActiveCompanyId(id);
    setActiveId(id);
  }, []);

  const value = useMemo(
    () => ({
      companies,
      active: companies.find((c) => c.id === activeId) ?? null,
      loading,
      error,
      selectCompany,
      reload,
    }),
    [companies, activeId, loading, error, selectCompany, reload]
  );

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany(): CompanyContextValue {
  const value = useContext(CompanyContext);
  if (!value) throw new Error('useCompany sa musí používať vnútri CompanyProvider');
  return value;
}
