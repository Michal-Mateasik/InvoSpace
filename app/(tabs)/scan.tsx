import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useIsFocused, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { useCompany } from '@/context/CompanyContext';
import { resolveScan, type ReceiptPrefill } from '@/services/ekasa';
import { colors } from '@/utils/colors';

export default function ScanScreen() {
  const router = useRouter();
  const { active } = useCompany();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  // Kamera pošle ten istý QR kód viackrát za sekundu; ref zabráni spracovaniu viackrát.
  const locked = useRef(false);
  const [torch, setTorch] = useState(false);

  // Po návrate na túto obrazovku (napr. zo formulára) sa skenovanie znova odomkne a blesk je vypnutý
  // (kamera sa pri opustení tabu vypína, takže by stav tlačidla nesedel so skutočnosťou).
  useFocusEffect(
    useCallback(() => {
      locked.current = false;
      setTorch(false);
    }, [])
  );

  function unlock() {
    locked.current = false;
  }

  // Haptická odozva je len spestrenie; ak zlyhá (napr. zariadenie ju nepodporuje), nič sa nestane.
  function vibrate(type: Haptics.NotificationFeedbackType) {
    Haptics.notificationAsync(type).catch(() => {});
  }

  function openForm(prefill?: ReceiptPrefill, notice?: string) {
    // Do trasy posielame len vyplnené hodnoty; parametre sú vždy texty.
    const params: Record<string, string> = { source: 'qr' };
    if (prefill?.ekasaId) params.ekasaId = prefill.ekasaId;
    if (prefill?.receiptNumber) params.receiptNumber = prefill.receiptNumber;
    if (prefill?.amountCents != null) params.amountCents = String(prefill.amountCents);
    if (prefill && prefill.vatRows.length > 0) params.vatRows = JSON.stringify(prefill.vatRows);
    if (prefill?.date) params.date = prefill.date;
    if (prefill?.merchant) params.merchant = prefill.merchant;
    if (prefill?.ico) params.ico = prefill.ico;
    if (notice) params.notice = notice;
    router.push({ pathname: '/receipt/edit', params });
  }

  async function handleScanned(raw: string) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      const outcome = await resolveScan(raw);

      if (outcome.kind === 'unknown') {
        vibrate(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Neznámy QR kód', 'Tento QR kód nie je z bločku eKasa. Môžeš skúsiť iný alebo doklad vyplniť ručne.', [
          { text: 'Skenovať znova', onPress: unlock },
          { text: 'Vyplniť ručne', onPress: () => router.push('/receipt/edit') },
        ]);
      } else if (outcome.kind === 'duplicate') {
        vibrate(Haptics.NotificationFeedbackType.Warning);
        const number = outcome.internalNumber ? ` ${outcome.internalNumber}` : '';
        const company = outcome.companyName ? ` (firma ${outcome.companyName})` : '';
        Alert.alert('Doklad už máš uložený', `Tento bloček si už naskenoval ako doklad${number}${company}.`, [
          { text: 'Skenovať znova', style: 'cancel', onPress: unlock },
          {
            text: 'Otvoriť doklad',
            onPress: () => router.push({ pathname: '/receipt/[id]', params: { id: outcome.receiptId } }),
          },
        ]);
      } else {
        vibrate(Haptics.NotificationFeedbackType.Success); // úspešné naskenovanie
        openForm(outcome.prefill, outcome.notice);
      }
    } catch (e) {
      // resolveScan chyby siete rieši sám; sem sa dostane napr. chyba databázy.
      console.error(e);
      Alert.alert('Chyba', 'QR kód sa nepodarilo spracovať.', [{ text: 'OK', onPress: unlock }]);
    } finally {
      setBusy(false);
    }
  }

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>Skenovanie bločkov</Text>
        <Text style={styles.text}>
          Na načítanie QR kódu z bločku potrebuje aplikácia prístup ku kamere.
          {!permission.canAskAgain && ' Povoliť ho môžeš v nastaveniach telefónu.'}
        </Text>
        <View style={styles.buttonWrap}>
          {permission.canAskAgain ? (
            <Button title="Povoliť kameru" onPress={requestPermission} />
          ) : (
            <Button title="Otvoriť nastavenia" onPress={() => Linking.openSettings()} />
          )}
        </View>
        <View style={styles.buttonWrap}>
          <Button title="Pridať doklad ručne" variant="secondary" onPress={() => router.push('/receipt/edit')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Kameru držíme zapnutú len vtedy, keď je tento tab vidieť. */}
      {isFocused && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => handleScanned(data)}
        />
      )}
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.overlayTop}>
          <Text style={styles.hint}>Namier kameru na QR kód na bločku</Text>
          {active && <Text style={styles.companyHint}>Firma: {active.name}</Text>}
        </View>
        <View style={styles.frame} pointerEvents="none" />
        <Pressable
          style={[styles.torchButton, torch && styles.torchButtonOn]}
          onPress={() => setTorch((on) => !on)}
          accessibilityLabel={torch ? 'Vypnúť blesk' : 'Zapnúť blesk'}
        >
          <Ionicons name={torch ? 'flash' : 'flash-off'} size={24} color={torch ? '#000000' : '#FFFFFF'} />
          <Text style={[styles.torchLabel, torch && styles.torchLabelOn]}>{torch ? 'Blesk zapnutý' : 'Blesk'}</Text>
        </Pressable>
        <View style={styles.buttonWrap}>
          <Button title="Pridať doklad ručne" variant="secondary" onPress={() => router.push('/receipt/edit')} />
        </View>
      </SafeAreaView>
      {busy && (
        <View style={styles.busy}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.busyText}>Načítavam doklad z eKasa…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  text: { fontSize: 16, color: colors.muted, textAlign: 'center' },
  buttonWrap: { alignSelf: 'stretch', paddingHorizontal: 16 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 24 },
  overlayTop: { alignItems: 'center', gap: 4, paddingHorizontal: 16 },
  hint: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  companyHint: { color: '#FFFFFF', fontSize: 13, opacity: 0.85 },
  frame: { width: 240, height: 240, borderRadius: 20, borderWidth: 3, borderColor: '#FFFFFF' },
  torchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  torchButtonOn: { backgroundColor: '#FFD60A' },
  torchLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  torchLabelOn: { color: '#000000' },
  busy: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', gap: 12 },
  busyText: { color: '#FFFFFF', fontSize: 16 },
});
