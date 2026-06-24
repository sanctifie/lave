import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { deliveriesService, DeliveryItem } from '../../src/services/deliveries.service';
import { DeliveryStatus } from '@mbolo/shared';
import { colors, spacing, radii, typography, shadows } from '../../src/theme';

const ACTIVE = new Set([
  DeliveryStatus.ASSIGNED,
  DeliveryStatus.EN_ROUTE_PICKUP,
  DeliveryStatus.PICKED_UP,
  DeliveryStatus.EN_ROUTE_DELIVERY,
]);

function formatFcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }

export default function CourierDashboard() {
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [deliveries,  setDeliveries]  = useState<DeliveryItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [available,   setAvailable]   = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await deliveriesService.list();
      setDeliveries(data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pending  = deliveries.filter((d) => d.status === DeliveryStatus.PENDING_ASSIGNMENT).length;
  const active   = deliveries.filter((d) => ACTIVE.has(d.status as DeliveryStatus));
  const done     = deliveries.filter((d) => d.status === DeliveryStatus.DELIVERED).length;

  const toggleAvailability = async (val: boolean) => {
    setAvailable(val);
    try {
      await deliveriesService.toggleAvailability(val);
    } catch {
      setAvailable(!val);
    }
  };

  const initials = (user?.name ?? 'L').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Espace livreur</Text>
          <Text style={styles.name}>{user?.name ?? 'Livreur'}</Text>
        </View>
        <Pressable onPress={logout} style={styles.avatarCircle} accessibilityLabel="Se déconnecter">
          <Text style={styles.avatarText}>{initials}</Text>
        </Pressable>
      </View>

      {/* Disponibilité */}
      <View style={[styles.availCard, available && styles.availCardOn]}>
        <View style={styles.availInfo}>
          <Text style={styles.availIcon}>{available ? '🟢' : '🔴'}</Text>
          <View>
            <Text style={styles.availTitle}>{available ? 'Disponible' : 'Indisponible'}</Text>
            <Text style={styles.availSub}>
              {available ? 'Vous recevrez les nouvelles livraisons' : 'Activez pour recevoir des missions'}
            </Text>
          </View>
        </View>
        <Switch
          value={available}
          onValueChange={toggleAvailability}
          trackColor={{ false: colors.border, true: colors.primaryLight }}
          thumbColor={available ? colors.primary : colors.textDisabled}
        />
      </View>

      {/* Banner */}
      <View style={styles.banner}>
        <View>
          <Text style={styles.bannerTitle}>Vos livraisons{'\n'}du jour</Text>
          <Text style={styles.bannerSub}>Rapide · Fiable · MBOLO</Text>
        </View>
        <Text style={styles.bannerEmoji}>🚚</Text>
      </View>

      {/* Stats */}
      <Text style={styles.sectionTitle}>Vue d'ensemble</Text>
      <View style={styles.statsRow}>
        {[
          { label: 'Disponibles',  value: pending,       color: colors.warning, icon: '⏳' },
          { label: 'En cours',     value: active.length,  color: colors.info,    icon: '🏃' },
          { label: 'Livrées',      value: done,           color: colors.success, icon: '✅' },
        ].map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={[styles.statValue, { color: s.color }]}>{loading ? '—' : s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Active delivery */}
      {active.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>En cours</Text>
          {active.slice(0, 2).map((d) => (
            <Pressable
              key={d.id}
              style={styles.delivCard}
              onPress={() => router.push(`/(courier)/deliveries/${d.id}` as never)}
            >
              <View style={styles.delivIconBox}>
                <Text style={{ fontSize: 22 }}>📦</Text>
              </View>
              <View style={styles.delivBody}>
                <Text style={styles.delivPatient}>{d.patientName}</Text>
                <Text style={styles.delivAddr} numberOfLines={1}>{d.patientAddress}</Text>
                <Text style={styles.delivTotal}>{formatFcfa(d.totalFcfa)}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </>
      )}

      <Pressable
        style={styles.viewAllBtn}
        onPress={() => router.push('/(courier)/deliveries' as never)}
      >
        <Text style={styles.viewAllText}>Voir toutes les livraisons →</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  welcome: { ...typography.caption, color: colors.textSecondary },
  name:    { ...typography.h3, color: colors.text },
  avatarCircle: {
    width: 40, height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.info,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...typography.label, color: colors.textOnDark, fontSize: 14 },

  availCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.card,
  },
  availCardOn: { borderWidth: 1.5, borderColor: colors.primary },
  availInfo:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  availIcon:   { fontSize: 20 },
  availTitle:  { ...typography.bodyMedium, color: colors.text },
  availSub:    { ...typography.caption, color: colors.textSecondary },

  banner: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.modal,
  },
  bannerTitle: { ...typography.h3, color: colors.textOnDark, lineHeight: 26 },
  bannerSub:   { ...typography.caption, color: colors.primaryLight, marginTop: spacing.xs },
  bannerEmoji: { fontSize: 52 },

  sectionTitle: { ...typography.h3, color: colors.text },

  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    ...shadows.card,
  },
  statIcon:  { fontSize: 22 },
  statValue: { ...typography.h2, lineHeight: 32 },
  statLabel: { ...typography.small, color: colors.textSecondary, textAlign: 'center' },

  delivCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  delivIconBox: {
    width: 48, height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  delivBody:    { flex: 1, gap: spacing.xs },
  delivPatient: { ...typography.bodyMedium, color: colors.text },
  delivAddr:    { ...typography.caption, color: colors.textSecondary },
  delivTotal:   { ...typography.label, color: colors.primary },
  chevron:      { ...typography.h3, color: colors.textDisabled },

  viewAllBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  viewAllText: { ...typography.label, color: colors.primary },
});
