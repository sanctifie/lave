import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, spacing, radii, typography } from '../../theme';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = ({ label, error, hint, ...props }: InputProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        {...props}
        style={[
          styles.input,
          focused && styles.inputFocused,
          !!error && styles.inputError,
        ]}
        placeholderTextColor={colors.textDisabled}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e)  => { setFocused(false); props.onBlur?.(e); }}
        accessibilityLabel={label}
      />

      {!!error && <Text style={styles.error}>{error}</Text>}
      {!error && !!hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper:      { gap: spacing.xs },
  label:        { ...typography.label, color: colors.textSecondary, textTransform: 'uppercase' },
  input: {
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    color: colors.text,
    ...typography.body,
  },
  inputFocused: { borderColor: colors.borderFocus },
  inputError:   { borderColor: colors.error },
  error:        { ...typography.caption, color: colors.error },
  hint:         { ...typography.caption, color: colors.textSecondary },
});
