import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ReceiptWithCategory } from '@/types';
import { colors } from '@/utils/colors';
import { formatAmount, formatDate } from '@/utils/format';

type Props = {
  receipt: ReceiptWithCategory;
  onPress: () => void;
};

export function ReceiptListItem({ receipt, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {receipt.image_uri ? (
        <Image source={{ uri: receipt.image_uri }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.noImage]} />
      )}
      <View style={styles.info}>
        <Text style={styles.merchant} numberOfLines={1}>
          {receipt.internal_number ? `${receipt.internal_number} · ` : ''}
          {receipt.merchant_name || 'Bez dodávateľa'}
        </Text>
        <View style={styles.meta}>
          {receipt.category_color && (
            <View style={[styles.dot, { backgroundColor: receipt.category_color }]} />
          )}
          <Text style={styles.metaText} numberOfLines={1}>
            {formatDate(receipt.purchase_date)}
            {receipt.category_name ? ` · ${receipt.category_name}` : ''}
          </Text>
        </View>
      </View>
      <Text style={styles.amount}>{formatAmount(receipt.amount_cents)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: { backgroundColor: colors.surface },
  thumbnail: { width: 48, height: 48, borderRadius: 8 },
  noImage: { backgroundColor: colors.surface },
  info: { flex: 1, gap: 4 },
  merchant: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  metaText: { fontSize: 13, color: colors.muted, flexShrink: 1 },
  amount: { fontSize: 16, fontWeight: '600', color: colors.text },
});
