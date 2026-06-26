import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { OrderStatus, AppointmentStatus } from '@mbolo/shared';
import { useAuthStore } from '../../src/store/auth.store';
import { ordersService, Order } from '../../src/services/orders.service';
import { appointmentsService, AppointmentListItem } from '../../src/services/appointments.service';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { colors, spacing, radii, typography, shadows } from '../../src/theme';

const ACTIVE_ORDER_STATUSES = new Set<string>([
  OrderStatus.PENDING_PHARMACY,
  OrderStatus.PHARMACY_ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY_FOR_PICKUP,
  OrderStatus.DISPATCHED,
]);

const ACTIVE_APPT_STATUSES = new Set<string>([
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.WAITING_ROOM,
  AppointmentStatus.IN_PROGRESS,
]);

const ORDER_STATUS_ICON: Record<string, string> = {
  [OrderStatus.PENDING_PHARMACY]:  '⏳',
  [OrderStatus.PHARMACY_ACCEPTED]: '✅',
  [OrderStatus.PREPARING]:         '🔧',
  [OrderStatus.READY_FOR_PICKUP]:  '📦',
  [OrderStatus.DISPATCHED]:        '🚚',
};

const SERVICES = [
  { icon: '📋', label: 'Ordonnance', route: '/(patient)/prescriptions', bg: colors.primarySurface },
  { icon: '👨‍⚕️', label: 'Médecin',    route: '/(patient)/appointments',  bg: '#FFF0EB' },
  { icon: '📦', label: 'Commandes',  route: '/(patient)/orders',         bg: '#E0F2FE' },
  { icon: '👤', label: 'Mon profil', route: '/(patient)/profile',        bg: '#F0FDF4' },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function formatFcfa(n: number) {
  return `${n.toLocaleString('fr-FR')} FCFA`;
}

export default function PatientHomeScreen() {
  const router  = useRouter();
  const user    = useAuthStore((s) => s.user);
  const logout  = useAuthStore((s) => s.logout);

  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [nextAppt,    setNextAppt]    = useState<AppointmentListItem | null>(null);
  const [loading,     setLoading]     = useState(true);

  const initials = (user?.name ?? 'P')
    .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const load = useCallback(async () => {
    setLoading(true);
    const [ordersRes, apptsRes] = await Promise.allSettled([
      ordersService.list(),
      appointmentsService.list(),
    ]);

    if (ordersRes.status === 'fulfilled') {
      setActiveOrder(ordersRes.value.find((o) => ACTIVE_ORDER_STATUSES.has(o.status)) ?? null);
    }
    if (apptsRes.status === 'fulfilled') {
      setNextAppt(apptsRes.value.find((a) => ACTIVE_APPT_STATUSES.has(a.status)) ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const hasActive = !loading && (activeOrder || nextAppt);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Bonjour,</Text>
          <Text style={styles.name}>{user?.name ?? 'Patient'}</Text>
        </View>
        <Pressable onPress={logout} style={styles.avatarCircle} accessibilityLabel="Se déconnecter">
          <Text style={styles.avatarText}>{initials}</Text>
        </Pressable>
      </View>

      {/* Banner — visible seulement si rien d'actif */}
      {!loading && !hasActive && (
        <View style={styles.banner}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>Comment pouvons-{'\n'}nous vous aider ?</Text>
            <Pressable style={styles.bannerBtn} onPress={() => router.push('/prescriptions/upload' as never)}>
              <Text style={styles.bannerBtnText}>Commencer →</Text>
            </Pressable>
          </View>
          <Text style={styles.bannerEmoji}>🏥</Text>
        </View>
      )}

      {/* En cours */}
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Chargement…</Text>
        </View>
      ) : hasActive ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>En cours</Text>

          {/* Commande active */}
          {activeOrder && (
            <Pressable
              style={styles.activeCard}
              onPress={() => router.push(`/(patient)/orders/${activeOrder.id}` as never)}
            >
              <View style={styles.activeCardLeft}>
                <Text style={styles.activeCardIcon}>
                  {ORDER_STATUS_ICON[activeOrder.status] ?? '📦'}
                </Text>
              </View>
              <View style={styles.activeCardBody}>
                <Text style={styles.activeCardTitle} numberOfLines={1}>
                  {activeOrder.pharmacyName ?? 'Commande en cours'}
                </Text>
                <Text style={styles.activeCardSub}>
                  {formatFcfa(activeOrder.totalFcfa + activeOrder.serviceFeeFcfa)}
                </Text>
              </View>
              <View style={styles.activeCardRight}>
                <StatusBadge status={activeOrder.status as OrderStatus} />
                <Text style={styles.chevron}>›</Text>
              </View>
            </Pressable>
          )}

          {/* Prochaine consultation */}
          {nextAppt && (
            <Pressable
              style={styles.activeCard}
              onPress={() => router.push(`/(patient)/appointments/${nextAppt.id}` as never)}
            >
              <View style={[styles.activeCardLeft, { backgroundColor: '#FFF0EB' }]}>
                <Text style={styles.activeCardIcon}>👨‍⚕️</Text>
              </View>
              <View style={styles.activeCardBody}>
                <Text style={styles.activeCardTitle} numberOfLines={1}>
                  Dr. {nextAppt.doctorName}
                </Text>
                <Text style={styles.activeCardSub}>
                  {nextAppt.type === 'immediate'
                    ? '⚡ Immédiat'
                    : nextAppt.scheduledAt
                    ? `📅 ${formatTime(nextAppt.scheduledAt)}`
                    : nextAppt.doctorSpecialty}
                </Text>
              </View>
              <View style={styles.activeCardRight}>
                <StatusBadge status={nextAppt.status as AppointmentStatus} />
                <Text style={styles.chevron}>›</Text>
              </View>
            </Pressable>
          )}
        </View>
      ) : null}

      {/* Services */}
      <Text style={styles.sectionTitle}>Nos services</Text>
      <View style={styles.servicesGrid}>
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

      {/* Actions rapides */}
      <Text style={styles.sectionTitle}>Actions rapides</Text>
      <View style={styles.quickCol}>
        <Pressable style={styles.quickCard} onPress={() => router.push('/prescriptions/upload' as never)}>
          <Text style={styles.quickIcon}>📋</Text>
          <View style={styles.quickBody}>
            <Text style={styles.quickTitle}>Envoyer une ordonnance</Text>
            <Text style={styles.quickSub}>À votre pharmacie en 30 secondes</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable style={styles.quickCard} onPress={() => router.push('/appointments/new' as never)}>
          <Text style={styles.quickIcon}>🩺</Text>
          <View style={styles.quickBody}>
            <Text style={styles.quickTitle}>Consulter un médecin</Text>
            <Text style={styles.quickSub}>Téléconsultation vidéo immédiate</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  welcome:     { ...typography.caption, color: colors.textSecondary },
  name:        { ...typography.h3, color: colors.text },
  avatarCircle: {
    width: 40, height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...typography.label, color: colors.textOnDark, fontSize: 14 },

  banner: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  loadingText: { ...typography.caption, color: colors.textSecondary },

  section:      { gap: spacing.sm },
  sectionTitle: { ...typography.h3, color: colors.text },

  activeCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  activeCardLeft: {
    width: 48, height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  activeCardIcon: { fontSize: 22 },
  activeCardBody: { flex: 1, gap: spacing.xs },
  activeCardTitle: { ...typography.bodyMedium, color: colors.text },
  activeCardSub:   { ...typography.caption, color: colors.textSecondary },
  activeCardRight: { alignItems: 'flex-end', gap: spacing.xs },
  chevron:         { ...typography.h3, color: colors.textDisabled },

  servicesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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

  quickCol: { gap: spacing.sm },
  quickCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  quickIcon:  { fontSize: 26 },
  quickBody:  { flex: 1, gap: spacing.xs },
  quickTitle: { ...typography.bodyMedium, color: colors.text },
  quickSub:   { ...typography.caption, color: colors.textSecondary },
});
