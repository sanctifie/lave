import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { appointmentsService } from '../../../src/services/appointments.service';
import { colors, spacing, radii, shadows, typography } from '../../../src/theme';

const POLL_INTERVAL_MS = 15_000;

export default function WaitingRoomScreen() {
  const router = useRouter();
  const { id, doctorName, doctorSpecialty, doctorBusy, scheduledAt } =
    useLocalSearchParams<{
      id:              string;
      doctorName:      string;
      doctorSpecialty: string;
      doctorBusy:      string;
      scheduledAt:     string;
    }>();

  const [status, setStatus]     = useState<string>('waiting_room');
  const [leaving, setLeaving]   = useState(false);
  const pulseAnim               = useRef(new Animated.Value(1)).current;

  // Animation pulsante du cercle d'attente
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue:         1.15,
          duration:        900,
          easing:          Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue:         1,
          duration:        900,
          easing:          Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Polling : vérifie si le médecin a démarré
  const poll = useCallback(async () => {
    try {
      const appt = await appointmentsService.getById(id);
      setStatus(appt.status);

      if (appt.status === 'in_progress') {
        // La session vidéo a démarré — on revient sur le détail du RDV
        router.replace(`/(patient)/appointments/${id}` as any);
      }
    } catch {
      // Silencieux — on re-essaie au prochain tick
    }
  }, [id, router]);

  useEffect(() => {
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [poll]);

  const isDelayed = (() => {
    if (!scheduledAt) return false;
    return Date.now() > new Date(scheduledAt).getTime();
  })();

  const isDoctorBusy = doctorBusy === '1';

  const handleLeave = () => {
    setLeaving(true);
    router.back();
  };

  return (
    <View style={styles.root}>
      {/* En-tête médecin */}
      <View style={styles.doctorCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(doctorName ?? 'D').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.doctorName}>{doctorName}</Text>
          <Text style={styles.specialty}>{doctorSpecialty}</Text>
        </View>
      </View>

      {/* Animation d'attente */}
      <View style={styles.pulseContainer}>
        <Animated.View style={[styles.pulseOuter, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.pulseInner}>
            <Text style={styles.pulseIcon}>⏳</Text>
          </View>
        </Animated.View>
      </View>

      {/* Message contextuel */}
      <View style={styles.messageBox}>
        {status === 'in_progress' ? (
          <>
            <Text style={styles.messageTitle}>La consultation commence !</Text>
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xs }} />
          </>
        ) : isDoctorBusy || isDelayed ? (
          <>
            <Text style={styles.messageTitle}>Le médecin termine une consultation</Text>
            <Text style={styles.messageBody}>
              Vous êtes le prochain patient. Restez disponible, vous serez pris en charge
              dès que le médecin sera libre. Vous recevrez une notification.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.messageTitle}>Vous êtes en salle d'attente</Text>
            <Text style={styles.messageBody}>
              Le médecin va vous rejoindre sous peu. Restez dans l'application —
              la consultation démarrera automatiquement.
            </Text>
          </>
        )}
      </View>

      {/* Heure du RDV si programmé */}
      {scheduledAt && (
        <View style={styles.timeBox}>
          <Text style={styles.timeLabel}>Heure prévue</Text>
          <Text style={styles.timeValue}>
            {new Date(scheduledAt).toLocaleTimeString('fr-FR', {
              hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </View>
      )}

      {/* Indicateur de polling */}
      <Text style={styles.polling}>Vérification automatique toutes les 15 secondes</Text>

      {/* Quitter */}
      <Pressable
        style={[styles.leaveBtn, leaving && { opacity: 0.5 }]}
        onPress={handleLeave}
        disabled={leaving}
      >
        <Text style={styles.leaveBtnText}>Quitter la salle d'attente</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: colors.background,
    padding:         spacing.md,
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing.md,
  },

  doctorCard: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.sm,
    backgroundColor: colors.surface,
    borderRadius:    radii.lg,
    padding:         spacing.md,
    width:           '100%',
    ...shadows.card,
  },
  avatar: {
    width:           52,
    height:          52,
    borderRadius:    26,
    backgroundColor: colors.primarySurface,
    justifyContent:  'center',
    alignItems:      'center',
  },
  avatarText: { ...typography.h3, color: colors.primary },
  doctorName: { ...typography.h3, color: colors.text },
  specialty:  { ...typography.caption, color: colors.primary },

  pulseContainer: {
    alignItems:     'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  pulseOuter: {
    width:           120,
    height:          120,
    borderRadius:    60,
    backgroundColor: colors.primary + '20',
    alignItems:      'center',
    justifyContent:  'center',
  },
  pulseInner: {
    width:           80,
    height:          80,
    borderRadius:    40,
    backgroundColor: colors.primarySurface,
    alignItems:      'center',
    justifyContent:  'center',
  },
  pulseIcon: { fontSize: 36 },

  messageBox: {
    backgroundColor: colors.surface,
    borderRadius:    radii.lg,
    padding:         spacing.md,
    width:           '100%',
    gap:             spacing.xs,
    ...shadows.card,
  },
  messageTitle: { ...typography.h3, color: colors.text, textAlign: 'center' },
  messageBody:  { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  timeBox: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    backgroundColor: colors.surface,
    borderRadius:    radii.md,
    padding:         spacing.sm,
    width:           '100%',
    ...shadows.card,
  },
  timeLabel: { ...typography.caption, color: colors.textSecondary },
  timeValue: { ...typography.h3, color: colors.primary },

  polling: { ...typography.small, color: colors.textDisabled, textAlign: 'center' },

  leaveBtn: {
    borderWidth:  1.5,
    borderColor:  colors.border,
    borderRadius: radii.lg,
    padding:      spacing.sm,
    width:        '100%',
    alignItems:   'center',
  },
  leaveBtnText: { ...typography.body, color: colors.textSecondary },
});
