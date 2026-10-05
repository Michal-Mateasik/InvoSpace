import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { deleteReceipt, getReceipt } from '@/db/receipts';
import { getVatRows } from '@/db/vat';
import { useLoadOnFocus } from '@/hooks/useLoadOnFocus';
import { deleteImage } from '@/services/files';
import { colors } from '@/utils/colors';
import { formatAmount, formatDate } from '@/utils/format';

export default function ReceiptDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const receiptId = Number(id);
  const [zoomed, setZoomed] = useState(false);

  const loader = useCallback(async () => {
    const [receipt, vatRows] = await Promise.all([getReceipt(receiptId), getVatRows(receiptId)]);
    return { receipt, vatRows };
  }, [receiptId]);
  const { data, loading, error } = useLoadOnFocus(loader);
  const receipt = data?.receipt ?? null;
  const vatRows = data?.vatRows ?? [];

  function confirmDelete() {
    Alert.alert('Zmazať doklad?', 'Doklad aj jeho fotka sa nenávratne zmažú.', [
      { text: 'Zrušiť', style: 'cancel' },
      { text: 'Zmazať', style: 'destructive', onPress: handleDelete },
    ]);
  }

  async function handleDelete() {
    if (!receipt) return;
    try {
      await deleteReceipt(receipt.id);
      deleteImage(receipt.image_uri);
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Chyba', 'Doklad sa nepodarilo zmazať.');
    }
  }

  if (loading) return <ActivityIndicator style={styles.center} color={colors.primary} />;
  if (error || !receipt) {
    return <Text style={[styles.center, styles.muted]}>{error ?? 'Doklad sa nenašiel.'}</Text>;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {receipt.image_uri && (
        <Pressable onPress={() => setZoomed(true)}>
          <Image source={{ uri: receipt.image_uri }} style={styles.image} resizeMode="cover" />
          <Text style={styles.hint}>Ťukni na fotku pre zväčšenie</Text>
        </Pressable>
      )}

      <Text style={styles.amount}>{formatAmount(receipt.amount_cents)}</Text>
      {receipt.amount_net_cents !== null && (
        <>
          <Row label="Suma bez DPH" value={formatAmount(receipt.amount_net_cents)} />
          <Row label="DPH" value={formatAmount(receipt.amount_cents - receipt.amount_net_cents)} />
        </>
      )}
      {vatRows.map((row) => (
        <Row
          key={row.rate}
          label={row.rate === 0 ? 'Bez DPH' : `Sadzba ${row.rate} %`}
          value={`základ ${formatAmount(row.base_cents)}, DPH ${formatAmount(row.vat_cents)}`}
        />
      ))}
      <Row label="Interné číslo" value={receipt.internal_number} />
      <Row label="Dodávateľ" value={receipt.merchant_name} />
      <Row label="Číslo dokladu" value={receipt.receipt_number} />
      <Row label="Identifikátor eKasa" value={receipt.ekasa_receipt_id} />
      <Row label="Dátum" value={formatDate(receipt.purchase_date)} />
      <Row label="Kategória" value={receipt.category_name} />
      <Row label="Poznámka" value={receipt.note} />

      <View style={styles.actions}>
        <Button
          title="Upraviť"
          onPress={() => router.push({ pathname: '/receipt/edit', params: { id: receipt.id } })}
        />
        <Button title="Zmazať" variant="danger" onPress={confirmDelete} />
      </View>

      <Modal visible={zoomed} transparent animationType="fade" onRequestClose={() => setZoomed(false)}>
        <Pressable style={styles.modal} onPress={() => setZoomed(false)}>
          {receipt.image_uri && (
            <Image source={{ uri: receipt.image_uri }} style={styles.fullImage} resizeMode="contain" />
          )}
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { marginTop: 80, alignSelf: 'center' },
  muted: { fontSize: 16, color: colors.muted },
  content: { padding: 16, gap: 12 },
  image: { width: '100%', height: 280, borderRadius: 12, backgroundColor: colors.surface },
  hint: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 6 },
  amount: { fontSize: 32, fontWeight: '700', color: colors.text },
  row: { gap: 2 },
  label: { fontSize: 13, color: colors.muted },
  value: { fontSize: 16, color: colors.text },
  actions: { gap: 10, marginTop: 12 },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  fullImage: { width: '100%', height: '100%' },
});
