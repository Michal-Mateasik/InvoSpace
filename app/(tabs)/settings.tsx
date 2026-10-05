import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import {
  addCategory,
  deleteCategory,
  getAllCategories,
  renameCategory,
  setCategoryAccounting,
} from '@/db/categories';
import { useCompany } from '@/context/CompanyContext';
import { getLastBackupAt, setLastBackupAt } from '@/db/backup';
import { useLoadOnFocus } from '@/hooks/useLoadOnFocus';
import { createBackup } from '@/services/backup';
import { pickBackupFile, restoreFromBackup } from '@/services/restore';
import type { Category } from '@/types';
import { colors } from '@/utils/colors';
import { formatDate, toIsoDate } from '@/utils/format';
import { ZipFormatError } from '@/utils/zipReader';

export default function SettingsScreen() {
  const router = useRouter();
  const { data: categories, loading, error, reload: refresh } = useLoadOnFocus(getAllCategories);
  const [newName, setNewName] = useState('');

  const { active, reload: reloadCompanies } = useCompany();
  const [restoreBusy, setRestoreBusy] = useState(false);

  // Obnovenie nahradí všetky dáta v telefóne, preto najprv výrazné varovanie.
  function confirmRestore() {
    Alert.alert(
      'Obnoviť zo zálohy?',
      'Obnovenie NAHRADÍ všetky dáta v tomto telefóne (firmy, doklady, kategórie aj fotky) dátami zo zálohy. Odporúčame najprv urobiť novú zálohu. Ak je záloha poškodená, nič sa nezmení.',
      [
        { text: 'Zrušiť', style: 'cancel' },
        { text: 'Vybrať zálohu', style: 'destructive', onPress: handleRestore },
      ]
    );
  }

  async function handleRestore() {
    setRestoreBusy(true);
    try {
      const file = await pickBackupFile();
      if (!file) return; // používateľ výber zrušil
      const result = await restoreFromBackup(file);
      await reloadCompanies();
      refresh();
      reloadLastBackup();
      const missing =
        result.missingPhotos > 0 ? `\nFotky, ktoré v zálohe chýbali: ${result.missingPhotos}.` : '';
      Alert.alert(
        'Záloha obnovená',
        `Firmy: ${result.companies}, doklady: ${result.receipts}, fotky: ${result.photos}.${missing}`
      );
    } catch (e) {
      console.error(e);
      const reason = e instanceof ZipFormatError ? e.message : 'Súbor sa nepodarilo prečítať.';
      Alert.alert('Zálohu sa nepodarilo obnoviť', `${reason} Dáta v telefóne ostali nezmenené.`);
    } finally {
      setRestoreBusy(false);
    }
  }

  const { data: lastBackup, reload: reloadLastBackup } = useLoadOnFocus(getLastBackupAt);
  const [backupBusy, setBackupBusy] = useState(false);

  // Vytvorí ZIP so všetkými dátami a fotkami a otvorí systémové zdieľanie (OneDrive, Súbory, e-mail…).
  async function handleBackup() {
    setBackupBusy(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Zdieľanie nie je dostupné', 'Na tomto zariadení sa záloha nedá odoslať.');
        return;
      }
      const result = await createBackup();
      await setLastBackupAt(new Date().toISOString());
      reloadLastBackup();
      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/zip',
        UTI: 'public.zip-archive',
        dialogTitle: 'Záloha InvoSpace',
      });
      if (result.missingPhotos > 0) {
        Alert.alert(
          'Niektoré fotky chýbajú',
          `${result.missingPhotos} ${result.missingPhotos === 1 ? 'fotka' : 'fotiek'} sa do zálohy nedostalo, lebo súbor v telefóne už neexistuje. Údaje dokladov sú zálohované.`
        );
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Chyba', 'Zálohu sa nepodarilo vytvoriť. Skontroluj voľné miesto v telefóne a skús to znova.');
    } finally {
      setBackupBusy(false);
    }
  }

  // Názvy sú jedinečné; porovnávame bez ohľadu na veľkosť písmen.
  function nameExists(name: string, exceptId?: number) {
    return (categories ?? []).some(
      (c) => c.id !== exceptId && c.name.toLowerCase() === name.toLowerCase()
    );
  }

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    if (nameExists(name)) {
      Alert.alert('Kategória už existuje', 'Vyber iný názov.');
      return;
    }
    try {
      await addCategory(name);
      setNewName('');
      Keyboard.dismiss();
      refresh();
    } catch (e) {
      console.error(e);
      Alert.alert('Chyba', 'Kategóriu sa nepodarilo pridať.');
    }
  }

  function handleRename(category: Category) {
    // Alert.prompt funguje len na iOS, čo je cieľová platforma aplikácie.
    Alert.prompt('Premenovať kategóriu', undefined, async (text) => {
      const name = text?.trim();
      if (!name || name === category.name) return;
      if (nameExists(name, category.id)) {
        Alert.alert('Kategória už existuje', 'Vyber iný názov.');
        return;
      }
      try {
        await renameCategory(category.id, name);
        refresh();
      } catch (e) {
        console.error(e);
        Alert.alert('Chyba', 'Kategóriu sa nepodarilo premenovať.');
      }
    }, 'plain-text', category.name);
  }

  // Predkontácia z Pohody, ktorá sa pri exporte pošle pri položkách dokladov tejto kategórie.
  function handleAccounting(category: Category) {
    Alert.prompt(
      `Predkontácia: ${category.name}`,
      'Zadaj text, ktorý sa pri exporte vloží do poľa Text dokladu v Pohode (napr. 5Pv), aby sa dalo podľa neho filtrovať. Prázdne pole ho odstráni.',
      async (text) => {
        const accounting = (text ?? '').trim().slice(0, 32);
        try {
          await setCategoryAccounting(category.id, accounting);
          refresh();
        } catch (e) {
          console.error(e);
          Alert.alert('Chyba', 'Predkontáciu sa nepodarilo uložiť.');
        }
      },
      'plain-text',
      category.pohoda_accounting
    );
  }

  function handleDelete(category: Category) {
    Alert.alert(
      `Zmazať „${category.name}“?`,
      'Doklady z tejto kategórie sa presunú do kategórie Ostatné.',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Zmazať',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(category.id);
              refresh();
            } catch (e) {
              console.error(e);
              Alert.alert('Chyba', 'Kategóriu sa nepodarilo zmazať.');
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text style={styles.title}>Nastavenia</Text>

        <Text style={styles.section}>Firma</Text>
        <View style={styles.companyCard}>
          <Text style={styles.companyName}>{active?.name ?? 'Žiadna firma'}</Text>
          <Text style={styles.muted}>IČO {active?.ico || '—'}</Text>
          <View style={styles.companyButtons}>
            <View style={styles.flex}>
              <Button title="Zmeniť firmu" variant="secondary" onPress={() => router.push('/companies')} />
            </View>
            {active && (
              <View style={styles.flex}>
                <Button
                  title="Upraviť údaje"
                  variant="secondary"
                  onPress={() => router.push({ pathname: '/company/edit', params: { id: active.id } })}
                />
              </View>
            )}
          </View>
        </View>

        <Text style={[styles.section, styles.sectionGap]}>Kategórie</Text>

        {loading && <ActivityIndicator color={colors.primary} />}
        {error && <Text style={styles.muted}>{error}</Text>}
        {categories?.map((category) => (
          <View key={category.id} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: category.color }]} />
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.muted}>
                {category.pohoda_accounting ? `Predkontácia: ${category.pohoda_accounting}` : 'Bez predkontácie'}
                {category.is_default === 1 ? ' · predvolená' : ''}
              </Text>
            </View>
            <View style={styles.actions}>
              <Pressable onPress={() => handleAccounting(category)} hitSlop={8}>
                <Ionicons name="calculator-outline" size={22} color={colors.primary} />
              </Pressable>
              {category.is_default === 0 && (
                <>
                  <Pressable onPress={() => handleRename(category)} hitSlop={8}>
                    <Ionicons name="pencil" size={20} color={colors.primary} />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(category)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </Pressable>
                </>
              )}
            </View>
          </View>
        ))}

        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="Nová kategória"
            onSubmitEditing={handleAdd}
          />
          <View>
            <Button title="Pridať" onPress={handleAdd} disabled={!newName.trim()} />
          </View>
        </View>

        <Text style={[styles.section, styles.sectionGap]}>Záloha dát</Text>
        <Text style={styles.muted}>
          Vytvorí jeden ZIP súbor so všetkými firmami, dokladmi, kategóriami a fotkami. Ulož ho na bezpečné miesto
          (napr. OneDrive); záloha nie je šifrovaná. Doklady sú inak uložené len v tomto telefóne. Zo zálohy sa dá
          obnoviť aj do nového telefónu (obnovenie nahradí všetky dáta).
        </Text>
        <Text style={styles.muted}>
          {lastBackup ? `Posledná záloha: ${formatDate(toIsoDate(new Date(lastBackup)))}` : 'Zálohu si zatiaľ nevytvoril.'}
        </Text>
        <View style={styles.exportButton}>
          <Button
            title={backupBusy ? 'Pripravujem zálohu…' : 'Zálohovať dáta'}
            onPress={handleBackup}
            disabled={backupBusy || restoreBusy}
          />
        </View>
        <View style={styles.exportButton}>
          <Button
            title={restoreBusy ? 'Obnovujem…' : 'Obnoviť zo zálohy'}
            variant="secondary"
            onPress={confirmRestore}
            disabled={backupBusy || restoreBusy}
          />
        </View>

        <Text style={[styles.section, styles.sectionGap]}>Export</Text>
        <Text style={styles.muted}>
          Mesačný XML súbor s údajmi dokladov firmy {active ? `„${active.name}“ ` : ''}(bez fotiek) na import do
          účtovného programu Pohoda.
        </Text>
        <View style={styles.exportButton}>
          <Button title="Export do Pohody" onPress={() => router.push('/export')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 4 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 12 },
  section: { fontSize: 14, fontWeight: '600', color: colors.muted, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dot: { width: 14, height: 14, borderRadius: 7 },
  categoryInfo: { flex: 1, gap: 2 },
  categoryName: { fontSize: 16, color: colors.text },
  name: { flex: 1, fontSize: 16, color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  actions: { flexDirection: 'row', gap: 20 },
  sectionGap: { marginTop: 32 },
  exportButton: { marginTop: 12 },
  flex: { flex: 1 },
  companyCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 4 },
  companyName: { fontSize: 17, fontWeight: '700', color: colors.text },
  companyButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
});
