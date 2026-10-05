import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/utils/colors';

import { Button } from './Button';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// Prázdny stav: ikona, nadpis a krátka rada, čo robiť ďalej (napr. „Zatiaľ nemáš žiadne doklady“).
export function EmptyState({ icon, title, hint }: { icon: IconName; title: string; hint?: string }) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={56} color={colors.border} />
      <Text style={styles.title}>{title}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

// Chybový stav s tlačidlom na opakovanie, aby používateľ nezostal na prázdnej obrazovke.
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={56} color={colors.danger} />
      <Text style={styles.title}>Niečo sa pokazilo</Text>
      <Text style={styles.hint}>{message}</Text>
      {onRetry && (
        <View style={styles.button}>
          <Button title="Skúsiť znova" onPress={onRetry} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 8, paddingHorizontal: 32, paddingVertical: 48 },
  title: { fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center', marginTop: 4 },
  hint: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  button: { alignSelf: 'stretch', marginTop: 12 },
});
