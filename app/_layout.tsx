import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { ErrorState } from '@/components/StateViews';
import { CompanyProvider } from '@/context/CompanyContext';
import { colors } from '@/utils/colors';

// Poistka: ak nejaká obrazovka napriek ošetreniu spadne, používateľ uvidí zrozumiteľnú hlášku
// s tlačidlom na opakovanie namiesto zrútenia aplikácie. Dáta v telefóne sa tým nemenia.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  console.error(error);
  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
      <ErrorState message="Aplikácia narazila na neočakávanú chybu. Tvoje doklady ostali v telefóne." onRetry={retry} />
    </View>
  );
}

// Koreňový layout: taby sú bez hlavičky, ostatné obrazovky majú hlavičku s tlačidlom späť.
// CompanyProvider drží zvolenú firmu pre celú aplikáciu.
export default function RootLayout() {
  return (
    <CompanyProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerBackTitle: 'Späť' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="companies" options={{ title: 'Firmy' }} />
        <Stack.Screen name="company/edit" options={{ title: 'Firma' }} />
        <Stack.Screen name="receipt/[id]" options={{ title: 'Detail dokladu' }} />
        <Stack.Screen name="receipt/edit" options={{ title: 'Doklad' }} />
        <Stack.Screen name="export" options={{ title: 'Export do Pohody' }} />
      </Stack>
    </CompanyProvider>
  );
}
