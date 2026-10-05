import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View, type ColorValue } from 'react-native';

import { ErrorState } from '@/components/StateViews';
import { useCompany } from '@/context/CompanyContext';
import { colors } from '@/utils/colors';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// Pomocná funkcia, aby sa ikona nemusela opakovať v každom tabe.
const tabIcon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} size={size} color={color} />;
  };

export default function TabsLayout() {
  const { active, loading, error, reload } = useCompany();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  // Pri chybe databázy by sa inak zobrazila výzva vytvoriť firmu, čo by bolo zavádzajúce.
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
        <ErrorState message={error} onRetry={reload} />
      </View>
    );
  }
  // Bez zvolenej firmy sa nedá evidovať nič, preto sa najprv vyberá alebo vytvára firma.
  if (!active) return <Redirect href="/companies" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Doklady', tabBarIcon: tabIcon('receipt-outline') }} />
      <Tabs.Screen name="scan" options={{ title: 'Skenovať', tabBarIcon: tabIcon('scan-outline') }} />
      <Tabs.Screen name="report" options={{ title: 'Prehľad', tabBarIcon: tabIcon('bar-chart-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Nastavenia', tabBarIcon: tabIcon('settings-outline') }} />
    </Tabs>
  );
}
