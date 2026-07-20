import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { careLinksService, ManagedOrder } from '../../../src/services/carelinks.service';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';

const STATUS_LABEL: Record<string, string> = {
  pending_pharmacy:     'En attente pharmacie',
  pending_substitution: 'Équivalent proposé',
  pharmacy_accepted:    'Acceptée',
  pharmacy_rejected:    'Refusée',
  preparing:            'En préparation',
  ready_for_pickup:     'Prête',
  dispatched:           'En livraison',
  delivered:            'Livrée',
  cancelled:            'Annulée',
};

export default function ManagedPatientOrders() {
  const { id, patientName } = useLocalSearchParams<{ id: string; patientName?: string }>();
  const router = useRouter();

  const [orders, setOrders]   = useState<ManagedOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setOrders(await careLinksService.patientOrders(id));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const formatFcfa = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Retour</Text></Pressable>
        <Text style={styles.pageTitle}>Commandes</Text>
        <View style={{ width: 56 }} />
      </View>

      <Text style={styles.subtitle}>
        Compte géré : {patientName ? decodeURIComponent(patientName) : '—'}
      </Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : orders.length === 0 ? (
        <Text style={styles.empty}>Aucune commande pour ce patient.</Text>
      ) : (
        orders.map((o) => (
          <Pressable
            key={o.id}
            style={styles.card}
            onPress={() => router.push(`/(patient)/orders/${o.id}` as never)}
          >
            <View style={styles.cardTop}>
              <Text style={styles.ref}>#{o.id.slice(-6).toUpperCase()}</Text>
              <Text style={styles.status}>{STATUS_LABEL[o.status] ?? o.status}</Text>
            </View>
            <Text style={styles.pharmacy}>{o.pharmacyName ?? 'Pharmacie'}</Text>
            <View style={styles.cardBottom}>
              <Text style={styles.date}>{new Date(o.createdAt).toLocaleDateString('fr-FR')}</Text>
              <Text style={styles.total}>{formatFcfa(o.totalFcfa)}</Text>
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: spacing.xl,
  },
  back:      { ...typography.bodyMedium, color: colors.primary },
  pageTitle: { ...typography.h3, color: colors.text },
  subtitle:  { ...typography.caption, color: colors.textSecondary },
  empty:     { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },

  card: {
    backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md,
    gap: spacing.xs, ...shadows.card,
  },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ref:        { ...typography.bodyMedium, color: colors.text },
  status:     { ...typography.caption, color: colors.primary },
  pharmacy:   { ...typography.caption, color: colors.textSecondary },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date:       { ...typography.caption, color: colors.textSecondary },
  total:      { ...typography.bodyMedium, color: colors.primary },
});
