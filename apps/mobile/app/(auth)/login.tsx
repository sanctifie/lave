import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { authService } from '../../src/services/auth.service';
import { colors, spacing, typography } from '../../src/theme';
import { fr } from '../../src/i18n/fr';

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone]     = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const cleaned = phone.replace(/\s/g, '');
    if (!/^\+?[1-9]\d{7,14}$/.test(cleaned)) {
      setError(fr.auth.invalidPhone);
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authService.requestOtp(cleaned);
      router.push({ pathname: '/(auth)/otp', params: { phone: cleaned } });
    } catch {
      Alert.alert('Erreur', fr.common.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / marque */}
        <View style={styles.header}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>M</Text>
          </View>
          <Text style={styles.title}>{fr.auth.title}</Text>
          <Text style={styles.subtitle}>{fr.auth.subtitle}</Text>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
          <Input
            label={fr.auth.phoneLabel}
            placeholder={fr.auth.phonePlaceholder}
            value={phone}
            onChangeText={(t) => { setPhone(t); setError(''); }}
            keyboardType="phone-pad"
            autoFocus
            error={error}
          />

          <Button
            label={loading ? fr.auth.sending : fr.auth.sendCode}
            onPress={handleSend}
            loading={loading}
          />
        </View>

        <Text style={styles.legal}>
          En continuant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:      { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: spacing.md, justifyContent: 'center', gap: spacing.xl },

  header: { alignItems: 'center', gap: spacing.md },
  logoPlaceholder: {
    width: 80, height: 80,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { ...typography.h1, color: colors.textOnDark },
  title:    { ...typography.h2, color: colors.text, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },

  form:  { gap: spacing.md },
  legal: { ...typography.small, color: colors.textDisabled, textAlign: 'center' },
});
