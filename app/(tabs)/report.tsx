import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarChart } from '@/components/BarChart';
import { CompanyBar } from '@/components/CompanyBar';
import { EmptyState, ErrorState } from '@/components/StateViews';
import { useCompany } from '@/context/CompanyContext';
import { getMonthlyTotals, getPeriodSummary } from '@/db/reports';
import { useLoadOnFocus } from '@/hooks/useLoadOnFocus';
import { colors } from '@/utils/colors';
import {
  currentMonth,
  formatAmount,
  formatMonth,
  formatMonthShort,
  shiftMonth,
} from '@/utils/format';

type Mode = 'month' | 'year';

export default function ReportScreen() {
  const { active } = useCompany();
  const companyId = active?.id ?? 0; // 0 = žiadna firma (taká v databáze nie je, výsledok je prázdny)
  const [mode, setMode] = useState<Mode>('month');
  // Vždy držíme jeden mesiac; rok z neho odvodíme, takže pri prepnutí režimu ostaneš v tom istom roku.
  const [month, setMonth] = useState(currentMonth());
  const year = month.slice(0, 4);
  const period = mode === 'year' ? year : month;

  const loader = useCallback(async () => {
    const summary = await getPeriodSummary(companyId, period);
    // Graf po mesiacoch dáva zmysel len pri ročnom pohľade.
    const monthly = period.length === 4 ? await getMonthlyTotals(companyId, period) : null;
    return { summary, monthly };
  }, [companyId, period]);
  const { data, loading, error, reload } = useLoadOnFocus(loader);

  // Do budúcnosti sa neprepíname, doklady tam byť nemôžu.
  const isLatest = mode === 'year' ? year >= currentMonth().slice(0, 4) : month >= currentMonth();
  const step = mode === 'year' ? 12 : 1;

  function renderContent() {
    if (loading) return <ActivityIndicator style={styles.center} color={colors.primary} />;
    if (error || !data) return <ErrorState message={error ?? 'Údaje sa nepodarilo načítať.'} onRetry={reload} />;

    const { summary, monthly } = data;
    if (summary.receiptCount === 0) {
      return (
        <EmptyState
          icon="bar-chart-outline"
          title={mode === 'year' ? 'V tomto roku nemáš žiadne doklady' : 'V tomto mesiaci nemáš žiadne doklady'}
          hint="Prepni na iné obdobie šípkami hore."
        />
      );
    }

    // Do grafu dáme všetkých 12 mesiacov; tie bez dokladov majú nulový stĺpec.
    const monthlyBars = monthly
      ? Array.from({ length: 12 }, (_, i) => {
          const key = `${year}-${String(i + 1).padStart(2, '0')}`;
          return {
            key,
            label: formatMonthShort(key),
            value: monthly.find((m) => m.month === key)?.total_cents ?? 0,
          };
        })
      : null;

    return (
      <>
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>{mode === 'year' ? 'Celkom za rok' : 'Celkom za mesiac'}</Text>
          <Text style={styles.totalValue}>{formatAmount(summary.totalCents)}</Text>
          <Text style={styles.totalNote}>Počet dokladov: {summary.receiptCount}</Text>
          {summary.netKnownCount > 0 && (
            <Text style={styles.totalNote}>
              Bez DPH: {formatAmount(summary.netCents)}
              {summary.netKnownCount < summary.receiptCount &&
                ` (len z ${summary.netKnownCount} dokladov, pri ostatných nie je uvedená)`}
            </Text>
          )}
        </View>

        {monthlyBars && (
          <>
            <Text style={styles.section}>Podľa mesiacov</Text>
            <BarChart
              showValues={false}
              data={monthlyBars.map((m) => ({ label: m.label, value: m.value, color: colors.primary }))}
            />
            {monthlyBars
              .filter((m) => m.value > 0)
              .map((m) => (
                <View key={m.key} style={styles.row}>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName}>{formatMonth(m.key)}</Text>
                  </View>
                  <Text style={styles.rowAmount}>{formatAmount(m.value)}</Text>
                </View>
              ))}
          </>
        )}

        <Text style={styles.section}>Podľa kategórií</Text>
        <BarChart
          data={summary.categories.map((c) => ({ label: c.name, value: c.total_cents, color: c.color }))}
        />

        {summary.categories.map((category) => (
          <View key={category.category_id ?? 'none'} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: category.color }]} />
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{category.name}</Text>
              <Text style={styles.rowMeta}>
                {category.receipt_count} {category.receipt_count === 1 ? 'doklad' : 'dokladov'} ·{' '}
                {Math.round((category.total_cents / summary.totalCents) * 100)} %
              </Text>
            </View>
            <Text style={styles.rowAmount}>{formatAmount(category.total_cents)}</Text>
          </View>
        ))}
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Prehľad</Text>
      <CompanyBar />

      <View style={styles.segmented}>
        {(['month', 'year'] as const).map((value) => (
          <Pressable
            key={value}
            style={[styles.segment, mode === value && styles.segmentActive]}
            onPress={() => setMode(value)}
          >
            <Text style={[styles.segmentLabel, mode === value && styles.segmentLabelActive]}>
              {value === 'month' ? 'Mesiac' : 'Rok'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.monthRow}>
        <Pressable onPress={() => setMonth(shiftMonth(month, -step))} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </Pressable>
        <Text style={styles.monthLabel}>{mode === 'year' ? year : formatMonth(month)}</Text>
        <Pressable onPress={() => setMonth(shiftMonth(month, step))} disabled={isLatest} hitSlop={12}>
          <Ionicons name="chevron-forward" size={26} color={isLatest ? colors.border : colors.primary} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>{renderContent()}</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, paddingHorizontal: 16, paddingTop: 12 },
  segmented: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 3,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  segment: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.background },
  segmentLabel: { fontSize: 15, color: colors.muted },
  segmentLabelActive: { color: colors.text, fontWeight: '600' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  monthLabel: { fontSize: 18, fontWeight: '600', color: colors.text },
  content: { padding: 16, paddingTop: 4, paddingBottom: 40, gap: 8 },
  center: { marginTop: 60, alignSelf: 'center' },
  totalCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 4 },
  totalLabel: { fontSize: 14, color: colors.muted },
  totalValue: { fontSize: 32, fontWeight: '700', color: colors.text },
  totalNote: { fontSize: 13, color: colors.muted },
  section: { fontSize: 14, fontWeight: '600', color: colors.muted, marginTop: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dot: { width: 14, height: 14, borderRadius: 7 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 16, color: colors.text },
  rowMeta: { fontSize: 13, color: colors.muted },
  rowAmount: { fontSize: 16, fontWeight: '600', color: colors.text },
});
