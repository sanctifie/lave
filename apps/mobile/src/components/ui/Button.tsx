import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, spacing, radii, typography, shadows } from '../../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = ({
  label,
  variant = 'primary',
  loading = false,
  fullWidth = true,
  disabled,
  ...props
}: ButtonProps) => {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...props}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? colors.textOnDark : colors.primary}
          size="small"
        />
      ) : (
        <Text style={[styles.label, styles[`label_${variant}`]]}>{label}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { width: '100%' },
  pressed:  { opacity: 0.85 },
  disabled: { opacity: 0.45 },

  primary:   { backgroundColor: colors.primary, ...shadows.button },
  secondary: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
  ghost:     { backgroundColor: 'transparent' },
  danger:    { backgroundColor: colors.error },

  label:          { ...typography.bodyMedium },
  label_primary:  { color: colors.textOnDark },
  label_secondary:{ color: colors.primary },
  label_ghost:    { color: colors.primary },
  label_danger:   { color: colors.textOnDark },
});
