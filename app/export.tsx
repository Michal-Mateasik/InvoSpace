import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { useCompany } from '@/context/CompanyContext';
import { getReceipts } from '@/db/receipts';
import { getVatRowsForMonth } from '@/db/vat';
import { useLoadOnFocus } from '@/hooks/useLoadOnFocus';
import { writeTempTextFile } from '@/services/files';
import { buildPohodaXml } from '@/services/pohoda';
import { colors } from '@/utils/colors';
import { currentMonth, formatAmount, formatMonth, shiftMonth } from '@/utils/format';

// Export dokladov aktívnej firmy za zvolený mesiac. Údaje pre Pohodu (IČO, pokladňa, predkontácia)
// sa berú z firmy, takže sa ich pri exporte nepýtame.
export default function ExportScreen() {
  const router = useRouter();
  const { active } = useCompany();
  const companyId = active?.id ?? 0; // 0 = žiadna firma (taká v databáze nie je, výsledok je prázdny)
  const [month, setMonth] = useState(currentMonth());
  const [busy, setBusy] = useState(false);

  const loader = useCallback(async () => {
    const [receipts, vat] = await Promise.all([
      getReceipts({ companyId, month, categoryId: null }),
      getVatRowsForMonth(companyId, month),
    ]);
    return { receipts, vat };
  }, [companyId, month]);
  const { data, loading, error } = useLoadOnFocus(loader);

  const receipts = data?.receipts ?? [];
  const total = receipts.reduce((sum, r) => sum + r.amount_cents, 0);
  const withoutVat = receipts.filter((r) => !data?.vat.get(r.id)?.length).length;
  const isCurrent = month >= currentMonth();

  // Čo ešte chýba vo firme, aby sa dalo exportovať.
  const missing: string[] = [];
  if (active && !/^\d{1,15}$/.test(active.ico)) missing.push('IČO');
  if (active && !active.pohoda_cash_account) missing.push('skratka pokladne');

  function editCompany() {
    if (active) router.push({ pathname: '/company/edit', params: { id: active.id } });
  }

  async function handleExport() {
    if (!active || !data) return;
    if (missing.length > 0) {
      Alert.alert('Doplň údaje firmy', `Vo firme chýba: ${missing.join(', ')}.`, [
        { text: 'Zrušiť', style: 'cancel' },
        { text: 'Upraviť firmu', onPress: editCompany },
      ]);
      return;
    }
    if (receipts.length === 0) {
      Alert.alert('Nie je čo exportovať', 'V tomto mesiaci nemá firma žiadne doklady.');
      return;
    }

    setBusy(true);
    try {
      const config = {
        ico: active.ico,
        cashAccount: active.pohoda_cash_account,
        accounting: active.pohoda_accounting,
      };
      const result = buildPohodaXml(month, receipts, data.vat, config);

      if (result.warnings.length > 0) {
        const proceed = await confirmWarnings(result.warnings);
        if (!proceed) return;
      }

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Zdieľanie nie je dostupné', 'Na tomto zariadení sa súbor nedá zdieľať.');
        return;
      }
      const uri = writeTempTextFile(result.fileName, result.xml);
      await Sharing.shareAsync(uri, { mimeType: 'text/xml', UTI: 'public.xml', dialogTitle: 'Export do Pohody' });
    } catch (e) {
      console.error(e);
      Alert.alert('Chyba', 'Export sa nepodarilo vytvoriť. Skús to prosím znova.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.company}>
        <Text style={styles.companyName}>{active?.name ?? 'Žiadna firma'}</Text>
        <Text style={styles.hint}>
          IČO {active?.ico || '—'} · pokladňa {active?.pohoda_cash_account || '—'}
          {active?.pohoda_accounting ? ` · predkontácia ${active.pohoda_accounting}` : ''}
        </Text>
        <Pressable onPress={editCompany} hitSlop={8}>
          <Text style={styles.link}>Upraviť údaje firmy</Text>
        </Pressable>
      </View>

      {missing.length > 0 && (
        <Text style={styles.warning}>Pred exportom doplň vo firme: {missing.join(', ')}.</Text>
      )}

      <View style={styles.monthRow}>
        <Pressable onPress={() => setMonth(shiftMonth(month, -1))} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </Pressable>
        <Text style={styles.monthLabel}>{formatMonth(month)}</Text>
        <Pressable onPress={() => setMonth(shiftMonth(month, 1))} disabled={isCurrent} hitSlop={12}>
          <Ionicons name="chevron-forward" size={26} color={isCurrent ? colors.border : colors.primary} />
        </Pressable>
      </View>

      <View style={styles.summary}>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : error ? (
          <Text style={styles.hint}>{error}</Text>
        ) : (
          <>
            <Text style={styles.summaryValue}>
              {receipts.length} {receipts.length === 1 ? 'doklad' : 'dokladov'} · {formatAmount(total)}
            </Text>
            {withoutVat > 0 && (
              <Text style={styles.warning}>
                {withoutVat} {withoutVat === 1 ? 'doklad nemá' : 'dokladov nemá'} rozpis DPH. Pri exporte ich
                Pohoda dostane ako bez DPH. Doplň ho v úprave dokladu (sadzba DPH).
              </Text>
            )}
          </>
        )}
      </View>

      <Text style={styles.hint}>
        Exportuje sa jeden XML súbor len s údajmi dokladov, bez fotiek. V Pohode ho nahraj cez Súbor → Dátová
        komunikácia → XML (import). Doklady, ktoré už Pohoda z tohto mesiaca importovala, sa pri opakovanom
        importe nezdvoja (ak si doklad po importe upravíš, oprav ho aj v Pohode).
      </Text>

      <Button title={busy ? 'Pripravujem…' : 'Exportovať XML'} onPress={handleExport} disabled={busy || loading} />
    </ScrollView>
  );
}

// Upozornenia ukážeme v dialógu; export pokračuje len po potvrdení.
function confirmWarnings(warnings: string[]): Promise<boolean> {
  const shown = warnings.slice(0, 6).join('\n');
  const more = warnings.length > 6 ? `\n… a ďalších ${warnings.length - 6}` : '';
  return new Promise((resolve) => {
    Alert.alert('Skontroluj doklady', `${shown}${more}`, [
      { text: 'Zrušiť', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Exportovať aj tak', onPress: () => resolve(true) },
    ]);
  });
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  company: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 4 },
  companyName: { fontSize: 17, fontWeight: '700', color: colors.text },
  link: { fontSize: 14, fontWeight: '600', color: colors.primary, marginTop: 4 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthLabel: { fontSize: 18, fontWeight: '600', color: colors.text },
  summary: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 6 },
  summaryValue: { fontSize: 16, fontWeight: '600', color: colors.text },
  warning: { fontSize: 13, color: '#9A5B00' },
  hint: { fontSize: 13, color: colors.muted },
});
