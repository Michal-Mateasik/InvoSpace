import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors } from '@/utils/colors';

type Option<T> = { value: T; label: string };

type Props<T> = {
  options: Option<T>[];
  selected: T;
  onSelect: (value: T) => void;
};

// Vodorovný posuvný riadok „čipov“ na filtrovanie (mesiac, kategória).
export function FilterChips<T extends string | number | null>({ options, selected, onSelect }: Props<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {options.map((option) => {
        const active = option.value === selected;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onSelect(option.value)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // ScrollView má predvolene flexGrow: 1 a v stĺpci by sa vertikálne natiahol na voľné miesto
  // (zväčšené čipy pri krátkom alebo prázdnom zozname). Rast preto vypíname.
  scroll: { flexGrow: 0 },
  row: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary },
  label: { fontSize: 14, color: colors.text },
  labelActive: { color: '#FFFFFF', fontWeight: '600' },
});
