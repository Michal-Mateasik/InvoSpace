import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompanyBar } from '@/components/CompanyBar';
import { FilterChips } from '@/components/FilterChips';
import { ReceiptListItem } from '@/components/ReceiptListItem';
import { EmptyState, ErrorState } from '@/components/StateViews';
import { useCompany } from '@/context/CompanyContext';
import { getAllCategories } from '@/db/categories';
import { getReceiptMonths, getReceipts } from '@/db/receipts';
import { useLoadOnFocus } from '@/hooks/useLoadOnFocus';
import { colors } from '@/utils/colors';
import { formatAmount, formatMonth } from '@/utils/format';

export default function ReceiptsScreen() {
  const router = useRouter();
  const { active } = useCompany();
  const companyId = active?.id ?? 0; // 0 = žiadna firma (taká v databáze nie je, výsledok je prázdny)
  const [month, setMonth] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const loader = useCallback(async () => {
    const [months, categories] = await Promise.all([getReceiptMonths(companyId), getAllCategories()]);
    // Zvolený mesiac alebo kategória už nemusia existovať (zmazaný doklad/kategória); vtedy filter zrušíme.
    const activeMonth = month && months.includes(month) ? month : null;
    const activeCategoryId = categories.some((c) => c.id === categoryId) ? categoryId : null;
    const receipts = await getReceipts({ companyId, month: activeMonth, categoryId: activeCategoryId });
    return { receipts, months, categories, activeMonth, activeCategoryId };
  }, [companyId, month, categoryId]);
  const { data, loading, error, reload } = useLoadOnFocus(loader);

  function renderContent() {
    if (loading) return <ActivityIndicator style={styles.center} color={colors.primary} />;
    if (error || !data) return <ErrorState message={error ?? 'Údaje sa nepodarilo načítať.'} onRetry={reload} />;

    const { receipts, months, categories, activeMonth, activeCategoryId } = data;
    // Bez jediného dokladu nemá zmysel ukazovať filtre.
    if (months.length === 0) {
      return (
        <EmptyState
          icon="receipt-outline"
          title="Zatiaľ nemáš žiadne doklady"
          hint="Naskenuj QR kód bločku v tabe Skenovať, alebo ťukni na + a pridaj doklad ručne."
        />
      );
    }

    const total = receipts.reduce((sum, receipt) => sum + receipt.amount_cents, 0);
    return (
      <>
        <FilterChips
          selected={activeMonth}
          onSelect={setMonth}
          options={[
            { value: null, label: 'Všetky mesiace' },
            ...months.map((m) => ({ value: m, label: formatMonth(m) })),
          ]}
        />
        <FilterChips
          selected={activeCategoryId}
          onSelect={setCategoryId}
          options={[
            { value: null, label: 'Všetky kategórie' },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Súčet ({receipts.length})</Text>
          <Text style={styles.totalValue}>{formatAmount(total)}</Text>
        </View>
        {receipts.length === 0 ? (
          <EmptyState
            icon="funnel-outline"
            title="Pre tento filter nie sú žiadne doklady"
            hint="Zmeň mesiac alebo kategóriu."
          />
        ) : (
          <FlatList
            data={receipts}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <ReceiptListItem
                receipt={item}
                onPress={() => router.push({ pathname: '/receipt/[id]', params: { id: item.id } })}
              />
            )}
          />
        )}
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Doklady</Text>
      <CompanyBar />
      <View style={styles.flex}>{renderContent()}</View>
      <Pressable style={styles.fab} onPress={() => router.push('/receipt/edit')}>
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  center: { marginTop: 80, alignSelf: 'center' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  totalLabel: { fontSize: 15, color: colors.muted },
  totalValue: { fontSize: 17, fontWeight: '700', color: colors.text },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
