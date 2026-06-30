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
import { ridesService, Ride } from '../../../src/services/rides.service';
import { paymentsService } from '../../../src/services/payments.service';
import { colors, spacing, radii, typography, shadows } from '../../../src/theme';

const STATUS_STEPS = [
  { key: 'pending',   label: 'En attente', icon: '🕐' },
  { key: 'assigned',  label: 'Chauffeur assigné', icon: '✅' },
  { key: 'en_route',  label: 'En route', icon: '🚗' },
  { key: 'arrived',   label: 'Arrivé', icon: '📍' },
  { key: 'completed', label: 'Course terminée', icon: '🎉' },
];

function formatFcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }

export default function RideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const [ride, setRide]         = useState<Ride | null>(null);
  const [loading, setLoading]   = useState(true);
  const [hasPaid, setHasPaid]   = useState(false);

  const load = useCallback(async () => {
    try {
      setRide(await ridesService.getById(id));
      const payStatus = await paymentsService.getRidePaymentStatus(id).catch(() => null);
      setHasPaid(!!payStatus?.transaction);
    } catch { /* handled below */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />;
  if (!ride) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.textSecondary }}>Course introuvable</Text>
    </View>
  );

  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === ride.status);
  const isCancelled = ride.status === 'cancelled';
  const isCompleted = ride.status === 'completed';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.backText} onPress={() => router.back()}>‹ Retour</Text>
        <Text style={styles.title}>Détail de la course</Text>
      </View>

      {/* Trajet */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Trajet</Text>
        <View style={styles.routeRow}>
          <View style={styles.routeDot} />
          <Text style={styles.routeText}>{ride.request.originLandmark}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: colors.error }]} />
          <Text style={styles.routeText}>{ride.request.destLandmark}</Text>
        </View>
      </View>

      {/* Tarif */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Estimation tarifaire</Text>
          <Text style={styles.value}>{formatFcfa(ride.fareEstFcfa)}</Text>
        </View>
        {ride.fareFinalFcfa && (
          <View style={styles.row}>
            <Text style={styles.label}>Tarif final</Text>
            <Text style={[styles.value, { color: colors.primary }]}>
              {formatFcfa(ride.fareFinalFcfa)}
            </Text>
          </View>
        )}
      </View>

      {/* Suivi de la course */}
      {!isCancelled && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Suivi</Text>
          {STATUS_STEPS.map((step, idx) => {
            const done    = idx < currentStepIdx;
            const current = idx === currentStepIdx;
            return (
              <View key={step.key} style={styles.stepRow}>
                <View style={[styles.stepDot, done && styles.stepDotDone, current && styles.stepDotActive]}>
                  <Text style={{ fontSize: 12 }}>{done ? '✓' : step.icon}</Text>
                </View>
                <Text style={[styles.stepLabel, (done || current) && styles.stepLabelActive]}>
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {isCancelled && (
        <View style={[styles.card, { backgroundColor: '#FEF2F2' }]}>
          <Text style={{ ...typography.bodyMedium, color: colors.error, textAlign: 'center' }}>
            ❌ Course annulée
          </Text>
        </View>
      )}

      {isCompleted && (
        <View style={[styles.card, { backgroundColor: '#F0FDF4' }]}>
          <Text style={{ ...typography.bodyMedium, color: '#16A34A', textAlign: 'center' }}>
            🎉 Course terminée avec succès
          </Text>
        </View>
      )}

      {ride.status === 'pending' && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Votre demande est en attente. Un chauffeur va l'accepter prochainement.
          </Text>
        </View>
      )}

      {/* Paiement */}
      {!isCancelled && (
        hasPaid ? (
          <View style={[styles.card, { backgroundColor: '#F0FDF4' }]}>
            <Text style={{ ...typography.body, color: '#16A34A', textAlign: 'center' }}>
              ✓ Paiement en escrow — libéré à la fin de la course
            </Text>
          </View>
        ) : (
          <Pressable
            style={styles.payBtn}
            onPress={() => router.push({
              pathname: '/(patient)/rides/pay' as any,
              params: { rideId: id, amount: String(ride.fareEstFcfa) },
            })}
          >
            <Text style={styles.payBtnText}>
              💳 Payer {ride.fareEstFcfa.toLocaleString('fr-FR')} FCFA
            </Text>
          </Pressable>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },

  header: {
    paddingTop: spacing.xl,
    gap: spacing.xs,
  },
  backText: { ...typography.body, color: colors.primary },
  title:    { ...typography.h3, color: colors.text },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  cardTitle: { ...typography.bodyMedium, color: colors.text },

  routeRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  routeDot:  { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  routeLine: { height: 20, width: 2, backgroundColor: colors.border, marginLeft: 5 },
  routeText: { ...typography.body, color: colors.text, flex: 1 },

  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { ...typography.body, color: colors.textSecondary },
  value: { ...typography.bodyMedium, color: colors.text },

  stepRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotDone:   { backgroundColor: '#D1FAE5' },
  stepDotActive: { backgroundColor: colors.primarySurface },
  stepLabel:     { ...typography.body, color: colors.textDisabled, flex: 1 },
  stepLabelActive: { color: colors.text },

  infoBox:  { backgroundColor: '#FFF7ED', borderRadius: radii.md, padding: spacing.md },
  infoText: { ...typography.caption, color: '#92400E' },

  payBtn: {
    backgroundColor: colors.primary,
    borderRadius:    radii.full,
    padding:         spacing.md,
    alignItems:      'center',
    ...shadows.card,
  },
  payBtnText: { ...typography.bodyMedium, color: colors.textOnDark },
});
