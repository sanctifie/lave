import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { careLinksService, CareLink, CareLinks } from '../../src/services/carelinks.service';
import { Button } from '../../src/components/ui/Button';
import { colors, spacing, radii, typography, shadows } from '../../src/theme';

const STATUS_LABEL: Record<string, string> = {
  pending:  'En attente',
  accepted: 'Actif',
  revoked:  'Rompu',
};

export default function CareScreen() {
  const router = useRouter();
  const role   = useAuthStore((s) => s.user?.role);
  const isCaregiver = role === 'accompagnant';

  const [links, setLinks]     = useState<CareLinks>({ caregivers: [], patients: [] });
  const [loading, setLoading] = useState(true);
  const [phone, setPhone]     = useState('');
  const [inviting, setInviting] = useState(false);
  const [busyId, setBusyId]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLinks(await careLinksService.list());
    } catch {
      Alert.alert('Erreur', 'Impossible de charger vos liens.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const invite = async () => {
    if (!phone.trim()) return;
    setInviting(true);
    try {
      await careLinksService.invite(phone.trim());
      setPhone('');
      await load();
      Alert.alert('Invitation envoyée', 'Votre aidant recevra une notification pour accepter.');
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.message ?? 'Invitation impossible.');
    } finally {
      setInviting(false);
    }
  };

  const accept = async (id: string) => {
    setBusyId(id);
    try { await careLinksService.accept(id); await load(); }
    catch (e: any) { Alert.alert('Erreur', e?.response?.data?.message ?? 'Action impossible.'); }
    finally { setBusyId(null); }
  };

  const revoke = (id: string, who: string) => {
    Alert.alert('Rompre le lien', `Confirmer la rupture du lien avec ${who} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Rompre', style: 'destructive',
        onPress: async () => {
          setBusyId(id);
          try { await careLinksService.revoke(id); await load(); }
          catch { Alert.alert('Erreur', 'Action impossible.'); }
          finally { setBusyId(null); }
        },
      },
    ]);
  };

  if (loading) return <ActivityIndicator style={styles.center} color={colors.primary} />;

  const activePatients = links.patients.filter((p) => p.status === 'accepted');

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Retour</Text></Pressable>
        <Text style={styles.pageTitle}>Mes proches</Text>
        <View style={{ width: 56 }} />
      </View>

      <Text style={styles.intro}>
        Un aidant peut suivre et gérer vos commandes à votre place — pratique pour
        un parent âgé ou un enfant. Vous gardez le contrôle : rompez le lien à tout moment.
      </Text>

      {/* Section patient : inviter un aidant */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ajouter un aidant</Text>
        <Text style={styles.cardHint}>
          Saisissez le numéro d'un compte accompagnant. Il devra accepter l'invitation.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Numéro de l'accompagnant"
          placeholderTextColor={colors.textDisabled}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Button
          label={inviting ? 'Envoi…' : 'Inviter'}
          onPress={invite}
          loading={inviting}
          disabled={inviting || !phone.trim()}
        />
      </View>

      {/* Mes aidants */}
      {links.caregivers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mes aidants</Text>
          {links.caregivers.map((l) => (
            <LinkRow key={l.id} link={l} busy={busyId === l.id} onRevoke={() => revoke(l.id, l.name)} />
          ))}
        </View>
      )}

      {/* Comptes que je gère (accompagnant) */}
      {links.patients.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comptes que je gère</Text>
          {links.patients.map((l) => (
            <View key={l.id} style={styles.rowCard}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{l.name}</Text>
                <Text style={styles.rowPhone}>{l.phone ?? ''}</Text>
              </View>
              <View style={styles.rowRight}>
                <StatusPill status={l.status} />
                {l.status === 'pending' && (
                  <Pressable
                    style={styles.acceptBtn}
                    onPress={() => accept(l.id)}
                    disabled={busyId === l.id}
                  >
                    <Text style={styles.acceptTxt}>{busyId === l.id ? '…' : 'Accepter'}</Text>
                  </Pressable>
                )}
                {l.status === 'accepted' && (
                  <Pressable
                    style={styles.viewBtn}
                    onPress={() => router.push(`/(patient)/care/${l.userId}?patientName=${encodeURIComponent(l.name)}` as never)}
                  >
                    <Text style={styles.viewTxt}>Commandes ›</Text>
                  </Pressable>
                )}
                {l.status !== 'revoked' && (
                  <Pressable onPress={() => revoke(l.id, l.name)} disabled={busyId === l.id}>
                    <Text style={styles.revokeTxt}>Rompre</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {isCaregiver && activePatients.length === 0 && links.patients.length === 0 && (
        <Text style={styles.emptyHint}>
          Aucun patient ne vous a encore désigné comme aidant.
        </Text>
      )}
    </ScrollView>
  );
}

function LinkRow({ link, busy, onRevoke }: { link: CareLink; busy: boolean; onRevoke: () => void }) {
  return (
    <View style={styles.rowCard}>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{link.name}</Text>
        <Text style={styles.rowPhone}>{link.phone ?? ''}</Text>
      </View>
      <View style={styles.rowRight}>
        <StatusPill status={link.status} />
        {link.status !== 'revoked' && (
          <Pressable onPress={onRevoke} disabled={busy}>
            <Text style={styles.revokeTxt}>Rompre</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'accepted' ? { bg: colors.successSurface, fg: colors.success } :
    status === 'pending'  ? { bg: colors.warningSurface, fg: colors.warning } :
                            { bg: colors.background,     fg: colors.textSecondary };
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text style={[styles.pillTxt, { color: tone.fg }]}>{STATUS_LABEL[status] ?? status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: spacing.xl,
  },
  back:      { ...typography.bodyMedium, color: colors.primary },
  pageTitle: { ...typography.h3, color: colors.text },
  intro:     { ...typography.caption, color: colors.textSecondary },

  card: {
    backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md,
    gap: spacing.sm, ...shadows.card,
  },
  cardTitle: { ...typography.bodyMedium, color: colors.text },
  cardHint:  { ...typography.caption, color: colors.textSecondary },
  input: {
    ...typography.body, color: colors.text,
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.md,
    padding: spacing.md, backgroundColor: colors.surface,
  },

  section:      { gap: spacing.sm },
  sectionTitle: { ...typography.bodyMedium, color: colors.text },

  rowCard: {
    backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    ...shadows.card,
  },
  rowInfo:  { flex: 1, gap: 2 },
  rowName:  { ...typography.bodyMedium, color: colors.text },
  rowPhone: { ...typography.caption, color: colors.textSecondary },
  rowRight: { alignItems: 'flex-end', gap: spacing.xs },

  pill:    { borderRadius: radii.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  pillTxt: { ...typography.small, fontWeight: '600' },

  acceptBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  acceptTxt: { ...typography.label, color: colors.textOnDark },
  viewBtn:   { paddingVertical: 2 },
  viewTxt:   { ...typography.caption, color: colors.primary, fontWeight: '600' },
  revokeTxt: { ...typography.small, color: colors.error },

  emptyHint: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg },
});
