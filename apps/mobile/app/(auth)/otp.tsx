import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { authService } from '../../src/services/auth.service';
import { useAuthStore } from '../../src/store/auth.store';
import { colors, spacing, radii, typography } from '../../src/theme';
import { fr } from '../../src/i18n/fr';

const OTP_LENGTH = 6;
const RESEND_DELAY = 60;

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router    = useRouter();
  const setAuth   = useAuthStore((s) => s.setAuth);

  const [code, setCode]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [countdown, setCountdown] = useState(RESEND_DELAY);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleVerify = async () => {
    if (code.length !== OTP_LENGTH) return;
    setLoading(true);
    try {
      const { token, user } = await authService.verifyOtp(phone, code);
      setAuth(token, user);
      // Redirection selon le rôle
      router.replace(getRoleRoot(user.role));
    } catch {
      Alert.alert('Code invalide', fr.auth.invalidCode);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      await authService.requestOtp(phone);
      setCountdown(RESEND_DELAY);
      setCode('');
    } catch {
      Alert.alert('Erreur', fr.common.error);
    }
  };

  // Affichage des cases OTP
  const digits = code.split('').concat(Array(OTP_LENGTH - code.length).fill(''));

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{fr.auth.otpTitle}</Text>
          <Text style={styles.subtitle}>{fr.auth.otpSubtitle(phone)}</Text>
        </View>

        {/* Cases OTP */}
        <Pressable style={styles.digitsRow} onPress={() => inputRef.current?.focus()}>
          {digits.map((d, i) => (
            <View
              key={i}
              style={[styles.digitBox, d ? styles.digitBoxFilled : undefined]}
            >
              <Text style={styles.digitText}>{d || ''}</Text>
            </View>
          ))}
        </Pressable>

        {/* Input caché qui capture la saisie */}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={(t) => {
            const digits = t.replace(/\D/g, '').slice(0, OTP_LENGTH);
            setCode(digits);
            if (digits.length === OTP_LENGTH) {
              // Auto-submit
              setTimeout(() => inputRef.current?.blur(), 50);
            }
          }}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          style={styles.hiddenInput}
          autoFocus
        />

        <Button
          label={loading ? fr.auth.verifying : fr.auth.verify}
          onPress={handleVerify}
          loading={loading}
          disabled={code.length !== OTP_LENGTH}
        />

        {/* Renvoi du code */}
        <Pressable onPress={handleResend} disabled={countdown > 0} style={styles.resendBtn}>
          <Text style={[styles.resend, countdown > 0 && styles.resendDisabled]}>
            {countdown > 0 ? fr.auth.resendIn(countdown) : fr.auth.resend}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function getRoleRoot(role: string): string {
  switch (role) {
    case 'partner_staff': return '/(pharmacy)';
    case 'courier':       return '/(courier)';
    case 'doctor':        return '/(doctor)';
    default:              return '/(patient)';
  }
}

const styles = StyleSheet.create({
  flex:      { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.md, justifyContent: 'center', gap: spacing.lg },

  header:    { alignItems: 'center', gap: spacing.sm },
  title:     { ...typography.h2, color: colors.text, textAlign: 'center' },
  subtitle:  { ...typography.body, color: colors.textSecondary, textAlign: 'center' },

  digitsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  digitBox: {
    width: 48, height: 56,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBoxFilled: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  digitText:      { ...typography.h2, color: colors.text },

  hiddenInput: { position: 'absolute', opacity: 0, height: 0 },

  resendBtn:     { alignItems: 'center' },
  resend:        { ...typography.bodyMedium, color: colors.primary },
  resendDisabled:{ color: colors.textDisabled },
});
