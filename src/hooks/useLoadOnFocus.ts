import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

// Načíta dáta vždy, keď sa obrazovka zobrazí (aj pri návrate späť),
// takže zoznam a detail sú po pridaní/úprave/zmazaní aktuálne.
// Funkcia `loader` musí byť stabilná (definovaná mimo komponentu alebo cez useCallback).
// `reload` načíta dáta znova na požiadanie (napr. po zmene priamo na obrazovke).
export function useLoadOnFocus<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loader()
        .then((result) => {
          if (!active) return;
          setData(result);
          setError(null);
        })
        .catch((e) => {
          console.error(e);
          if (active) setError('Údaje sa nepodarilo načítať.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
      // `version` je tu len preto, aby zmena verzie spustila načítanie znova.
    }, [loader, version])
  );

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { data, loading, error, reload };
}
