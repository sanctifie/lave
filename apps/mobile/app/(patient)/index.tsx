import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { colors, spacing, radii, typography, shadows } from '../../src/theme';

interface ServiceCategory {
  icon: string;
  label: string;
  route: string;
  bg: string;
}

const SERVICES: ServiceCategory[] = [
  { icon: '📋', label: 'Ordonnance',    route: '/(patient)/prescriptions', bg: colors.primarySurface },
  { icon: '👨‍⚕️', label: 'Médecin',       route: '/(patient)/appointments',  bg: '#FFF0EB' },
  { icon: '📦', label: 'Commandes',     route: '/(patient)/orders',         bg: '#E0F2FE' },
  { icon: '🚚', label: 'Livraison',     route: '/(patient)/orders',         bg: '#F0FDF4' },
];

const TIPS = [
  { title: 'Ordonnance prête ?', body: 'Envoyez-la à votre pharmacie en 30 secondes.', action: 'Envoyer', route: '/prescriptions/upload' },
  { title: 'Consultation vidéo', body: 'Un médecin disponible maintenant pour vous.', action: 'Consulter', route: '/appointments/new' },
];

export default function PatientHomeScreen() {
  const router  = useRouter();
  const user    = useAuthStore((s) => s.user);
  const logout  = useAuthStore((s) => s.logout);

  const initials = (user?.name ?? 'P')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Bonjour,</Text>
          <Text style={styles.name}>{user?.name ?? 'Patient'}</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={logout} style={styles.avatarCircle} accessibilityLabel="Se déconnecter">
            <Text style={styles.avatarText}>{initials}</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Banner ── */}
      <View style={styles.banner}>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>Comment pouvons-{'\n'}nous vous aider ?</Text>
          <Pressable
            style={styles.bannerBtn}
            onPress={() => router.push('/prescriptions/upload' as never)}
          >
            <Text style={styles.bannerBtnText}>Commencer →</Text>
          </Pressable>
        </View>
        <Text style={styles.bannerEmoji}>🏥</Text>
      </View>

      {/* ── Services ── */}
      <Text style={styles.sectionTitle}>Nos services</Text>
      <View style={styles.servicesRow}>
        {SERVICES.map((s) => (
          <Pressable
            key={s.label}
            style={({ pressed }) => [styles.serviceItem, pressed && { opacity: 0.75 }]}
            onPress={() => router.push(s.route as never)}
            accessibilityLabel={s.label}
          >
            <View style={[styles.serviceCircle, { backgroundColor: s.bg }]}>
              <Text style={styles.serviceIcon}>{s.icon}</Text>
            </View>
            <Text style={styles.serviceLabel}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* ── Tips ── */}
      <Text style={styles.sectionTitle}>Actions rapides</Text>
      <View style={styles.tipsCol}>
        {TIPS.map((tip) => (
          <View key={tip.title} style={styles.tipCard}>
            <View style={styles.tipBody}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipDesc}>{tip.body}</Text>
            </View>
            <Pressable
              style={styles.tipBtn}
              onPress={() => router.push(tip.route as never)}
            >
              <Text style={styles.tipBtnText}>{tip.action}</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  welcome:     { ...typography.caption, color: colors.textSecondary },
  name:        { ...typography.h3, color: colors.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatarCircle: {
    width: 40, height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...typography.label, color: colors.textOnDark, fontSize: 14 },

  /* Banner */
  banner: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    ...shadows.modal,
  },
  bannerContent: { flex: 1, gap: spacing.md },
  bannerTitle:   { ...typography.h3, color: colors.textOnDark, lineHeight: 26 },
  bannerBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.textOnDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  bannerBtnText: { ...typography.label, color: colors.primary },
  bannerEmoji:   { fontSize: 52, marginLeft: spacing.sm },

  /* Section */
  sectionTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },

  /* Services */
  servicesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  serviceItem: { alignItems: 'center', gap: spacing.xs },
  serviceCircle: {
    width: 64, height: 64,
    borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.card,
  },
  serviceIcon:  { fontSize: 26 },
  serviceLabel: { ...typography.small, color: colors.textSecondary, textAlign: 'center', maxWidth: 64 },

  /* Tips */
  tipsCol: { gap: spacing.md },
  tipCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.card,
  },
  tipBody:    { flex: 1, gap: spacing.xs },
  tipTitle:   { ...typography.bodyMedium, color: colors.text },
  tipDesc:    { ...typography.caption, color: colors.textSecondary },
  tipBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
  },
  tipBtnText: { ...typography.label, color: colors.textOnDark },
});
