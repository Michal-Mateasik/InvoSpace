import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Category } from '@/types';
import { colors } from '@/utils/colors';

type Props = {
  categories: Category[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

export function CategoryChips({ categories, selectedId, onSelect }: Props) {
  return (
    <View style={styles.row}>
      {categories.map((category) => {
        const selected = category.id === selectedId;
        return (
          <Pressable
            key={category.id}
            onPress={() => onSelect(category.id)}
            style={[styles.chip, selected && { backgroundColor: category.color, borderColor: category.color }]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{category.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: 14, color: colors.text },
  labelSelected: { color: '#FFFFFF', fontWeight: '600' },
});
