import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useCompany } from '@/context/CompanyContext';
import { colors } from '@/utils/colors';

// Pruh s názvom aktívnej firmy; ťuknutím sa otvorí výber firmy.
export function CompanyBar() {
  const router = useRouter();
  const { active } = useCompany();
  return (
    <Pressable style={styles.bar} onPress={() => router.push('/companies')}>
      <Ionicons name="business-outline" size={16} color={colors.primary} />
      <Text style={styles.name} numberOfLines={1}>
        {active?.name ?? 'Vybrať firmu'}
      </Text>
      <Ionicons name="chevron-down" size={16} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  name: { fontSize: 14, fontWeight: '600', color: colors.primary, flexShrink: 1 },
});
