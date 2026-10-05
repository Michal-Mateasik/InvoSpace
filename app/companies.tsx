import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { useCompany } from '@/context/CompanyContext';
import type { Company } from '@/types';
import { colors } from '@/utils/colors';

// Výber firmy. Zobrazí sa pri prvom spustení (kým nie je žiadna firma) a vždy, keď používateľ
// ťukne na názov firmy v hlavičke obrazoviek.
export default function CompaniesScreen() {
  const router = useRouter();
  const { companies, active, selectCompany } = useCompany();

  async function handleSelect(company: Company) {
    try {
      await selectCompany(company.id);
      router.dismissTo('/');
    } catch (e) {
      console.error(e);
      Alert.alert('Chyba', 'Firmu sa nepodarilo zvoliť.');
    }
  }

  return (
    <View style={styles.container}>
      {companies.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Vitaj v InvoSpace</Text>
          <Text style={styles.emptyText}>
            Najprv vytvor firmu, pre ktorú budeš evidovať bločky. Zadáš jej názov, IČO a údaje pre export do
            Pohody, aby sa ich nemusel pýtať pri každom exporte.
          </Text>
        </View>
      ) : (
        <FlatList
          data={companies}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => handleSelect(item)}>
              <View style={styles.rowInfo}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>IČO {item.ico || '—'}</Text>
              </View>
              {item.id === active?.id && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
              <Pressable
                hitSlop={10}
                onPress={() => router.push({ pathname: '/company/edit', params: { id: item.id } })}
              >
                <Ionicons name="pencil" size={20} color={colors.primary} />
              </Pressable>
            </Pressable>
          )}
        />
      )}
      <View style={styles.footer}>
        <Button title="Pridať firmu" onPress={() => router.push('/company/edit')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16 },
  empty: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  emptyTitle: { fontSize: 26, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyText: { fontSize: 16, color: colors.muted, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  rowInfo: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: '600', color: colors.text },
  meta: { fontSize: 13, color: colors.muted },
  footer: { padding: 16 },
});
