import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/utils/colors';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
};

export function Button({ title, onPress, variant = 'primary', disabled = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        (pressed || disabled) && styles.dimmed,
      ]}
    >
      <Text style={[styles.text, variant !== 'primary' && styles.textOnLight]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface },
  danger: { backgroundColor: colors.surface },
  dimmed: { opacity: 0.5 },
  text: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  textOnLight: { color: colors.primary },
});
