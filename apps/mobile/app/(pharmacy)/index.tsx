import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { pharmacyService, InboxPrescription, PharmacyOrder } from '../../src/services/pharmacy.service';
import { colors, spacing, radii, typography, shadows } from '../../src/theme';
import { OrderStatus, PrescriptionStatus } from '@mbolo/shared';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function PharmacyDashboard() {
  const router  = useRouter();
  const user    = useAuthStore((s) => s.user);
  const logout  = useAuthStore((s) => s.logout);

  const [inbox, setInbox]     = useState<InboxPrescription[]>([]);
  const [orders, setOrders]   = useState<PharmacyOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [rx, ord] = await Promise.all([
        pharmacyService.inbox(),
        pharmacyService.listOrders(),
      ]);
      setInbox(rx);
      setOrders(ord);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pendingRx    = inbox.filter((r) => r.status === PrescriptionStatus.PENDING_VALIDATION).length;
  const newOrders    = orders.filter((o) => o.status === OrderStatus.PENDING_PHARMACY);
  const activeOrders = orders.filter((o) =>
    [OrderStatus.PHARMACY_ACCEPTED, OrderStatus.PREPARING].includes(o.status as OrderStatus)
  ).length;
  const readyOrders  = orders.filter((o) => o.status === OrderStatus.READY_FOR_PICKUP).length;

  const initials = (user?.name ?? 'P').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Espace pharmacie</Text>
          <Text style={styles.name}>{user?.name ?? 'Pharmacien'}</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={logout} style={styles.avatarCircle} accessibilityLabel="Se déconnecter">
            <Text style={styles.avatarText}>{initials}</Text>
          </Pressable>
        </View>
      </View>

      {/* Banner */}
      <View style={styles.banner}>
        <View>
          <Text style={styles.bannerTitle}>Gérez vos{'\n'}ordonnances</Text>
          <Text style={styles.bannerSub}>Validez, préparez, livrez</Text>
        </View>
        <Text style={styles.bannerEmoji}>💊</Text>
      </View>

      {/* Stats */}
      <Text style={styles.sectionTitle}>Vue d'ensemble</Text>
      <View style={styles.statsRow}>
        {[
          { label: 'Ordonnances\nen attente', value: pendingRx,          color: colors.warning, icon: '📋' },
          { label: 'Commandes\nen cours',     value: activeOrders,        color: colors.info,    icon: '🔧' },
          { label: 'Prêtes à\nlivrer',         value: readyOrders,         color: colors.success, icon: '📦' },
        ].map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={[styles.statValue, { color: s.color }]}>{loading ? '—' : s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Nouvelles commandes à traiter */}
      {!loading && newOrders.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🆕 Nouvelles commandes</Text>
            <Pressable onPress={() => router.push('/(pharmacy)/orders' as never)}>
              <Text style={styles.seeAll}>Voir tout</Text>
            </Pressable>
          </View>
          {newOrders.slice(0, 3).map((o) => (
            <Pressable
              key={o.id}
              style={[styles.rxCard, styles.orderCard]}
              onPress={() => router.push('/(pharmacy)/orders' as never)}
            >
              <View style={[styles.rxIconBox, { backgroundColor: colors.warningSurface }]}>
                <Text style={{ fontSize: 22 }}>💊</Text>
              </View>
              <View style={styles.rxBody}>
                <Text style={styles.rxPatient}>{o.patientName}</Text>
                <Text style={styles.rxDate}>{formatDate(o.createdAt)} — {o.totalFcfa.toLocaleString('fr-FR')} FCFA</Text>
              </View>
              <View style={[styles.urgentBadge, { backgroundColor: colors.errorSurface }]}>
                <Text style={[styles.urgentText, { color: colors.error }]}>À traiter</Text>
              </View>
            </Pressable>
          ))}
        </>
      )}

      {/* Dernières ordonnances */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Dernières ordonnances</Text>
        <Pressable onPress={() => router.push('/(pharmacy)/prescriptions' as never)}>
          <Text style={styles.seeAll}>Voir tout</Text>
        </Pressable>
      </View>

      {inbox.length === 0 && !loading ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Aucune ordonnance en attente</Text>
        </View>
      ) : (
        inbox.slice(0, 3).map((rx) => (
          <Pressable
            key={rx.id}
            style={styles.rxCard}
            onPress={() => router.push(`/(pharmacy)/prescriptions/${rx.id}` as never)}
          >
            <View style={styles.rxIconBox}>
              <Text style={{ fontSize: 22 }}>📄</Text>
            </View>
            <View style={styles.rxBody}>
              <Text style={styles.rxPatient}>{rx.patientName}</Text>
              <Text style={styles.rxDate}>{formatDate(rx.createdAt)}</Text>
            </View>
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentText}>À valider</Text>
            </View>
          </Pressable>
        ))
      )}
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
  headerRight: {},
  avatarCircle: {
    width: 40, height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
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
  bannerTitle: { ...typography.h3, color: colors.textOnDark, lineHeight: 26 },
  bannerSub:   { ...typography.caption, color: colors.primaryLight, marginTop: spacing.xs },
  bannerEmoji: { fontSize: 52 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle:  { ...typography.h3, color: colors.text },
  seeAll:        { ...typography.label, color: colors.primary },

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

  rxCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  orderCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  rxIconBox: {
    width: 48, height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  rxBody:    { flex: 1, gap: spacing.xs },
  rxPatient: { ...typography.bodyMedium, color: colors.text },
  rxDate:    { ...typography.caption, color: colors.textSecondary },
  urgentBadge: {
    backgroundColor: colors.warningSurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radii.full,
  },
  urgentText: { ...typography.label, color: colors.warning },

  emptyBox:  { alignItems: 'center', padding: spacing.lg },
  emptyText: { ...typography.caption, color: colors.textSecondary },
});
