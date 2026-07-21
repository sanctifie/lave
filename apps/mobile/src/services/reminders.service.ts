import * as Notifications from 'expo-notifications';
import { apiClient } from './client';

/**
 * Rappels de prise. La source de vérité est désormais le SERVEUR (ils survivent
 * au changement de téléphone) ; les notifications locales d'expo-notifications
 * restent le canal de livraison, (re)planifiées à partir du plan serveur.
 * Repli hors-ligne : si le serveur est injoignable, on fonctionne en local seul.
 */

export interface ReminderGroup {
  /** Identifiant du rappel (id serveur, ou id local en repli hors-ligne). */
  groupId: string;
  medication: string;
  times: string[];      // ex. ['08:00', '20:00']
  durationDays: number;
  /** Nombre d'occurrences encore planifiées (à venir). */
  remaining: number;
  /** Prochaine échéance planifiée, si connue. */
  nextAt: Date | null;
}

interface ServerReminder {
  id: string;
  medication: string;
  times: string[];
  durationDays: number;
}

const REMINDER_TYPE = 'medication_reminder';

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

/** Planifie les notifications locales d'un rappel (canal de livraison). */
async function scheduleLocal(groupId: string, medication: string, times: string[], durationDays: number): Promise<number> {
  const now = new Date();
  let scheduled = 0;
  for (let day = 0; day < durationDays; day++) {
    for (const t of times) {
      const [h, m] = t.split(':').map((x) => parseInt(x, 10));
      if (Number.isNaN(h) || Number.isNaN(m)) continue;
      const when = new Date(now);
      when.setDate(now.getDate() + day);
      when.setHours(h, m, 0, 0);
      if (when.getTime() <= now.getTime() + 1000) continue; // occurrence déjà passée
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💊 Rappel de prise',
          body: `C'est l'heure de prendre : ${medication}`,
          data: { type: REMINDER_TYPE, groupId, medication, times, durationDays },
        },
        trigger: { date: when },
      });
      scheduled++;
    }
  }
  return scheduled;
}

/** Regroupe les notifications locales planifiées par rappel. */
async function readLocalGroups(): Promise<Map<string, ReminderGroup>> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const groups = new Map<string, ReminderGroup>();
  for (const n of all) {
    const data = (n.content.data ?? {}) as Record<string, any>;
    if (data.type !== REMINDER_TYPE || !data.groupId) continue;
    const trigger = n.trigger as any;
    const at: Date | null =
      trigger?.date != null ? new Date(trigger.date)
      : trigger?.value != null ? new Date(trigger.value)
      : null;
    const existing = groups.get(data.groupId);
    if (existing) {
      existing.remaining += 1;
      if (at && (!existing.nextAt || at < existing.nextAt)) existing.nextAt = at;
    } else {
      groups.set(data.groupId, {
        groupId: data.groupId,
        medication: data.medication ?? '—',
        times: Array.isArray(data.times) ? data.times : [],
        durationDays: data.durationDays ?? 0,
        remaining: 1,
        nextAt: at,
      });
    }
  }
  return groups;
}

/** Lecture IA d'une posologie en texte libre → horaires + durée proposés. */
export async function parsePosology(instructions: string): Promise<{ times: string[]; durationDays: number } | null> {
  try {
    const { data } = await apiClient.post<{ data: { times: string[]; durationDays: number } | null }>(
      '/reminders/parse',
      { instructions },
    );
    return data.data ?? null;
  } catch {
    return null;
  }
}

/** Crée un rappel : persistance serveur (source de vérité) + notifications locales. */
export async function scheduleMedicationReminders(params: {
  medication: string;
  times: string[];
  durationDays: number;
}): Promise<{ groupId: string; scheduled: number }> {
  const { medication, times, durationDays } = params;
  let id: string | undefined;
  try {
    const { data } = await apiClient.post<{ data: ServerReminder }>('/reminders', { medication, times, durationDays });
    id = data.data?.id;
  } catch {
    // Hors-ligne : on planifie quand même en local avec un id temporaire.
  }
  const groupId = id ?? `rem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const scheduled = await scheduleLocal(groupId, medication, times, durationDays);
  return { groupId, scheduled };
}

/** Liste les rappels (serveur = source de vérité) et re-planifie le local manquant. */
export async function listReminders(): Promise<ReminderGroup[]> {
  let server: ServerReminder[] = [];
  let online = true;
  try {
    const { data } = await apiClient.get<{ data: ServerReminder[] }>('/reminders');
    server = data.data ?? [];
  } catch {
    online = false;
  }

  let local = await readLocalGroups();

  // Nouveau téléphone / notifications perdues : on re-planifie depuis le serveur.
  for (const r of server) {
    if (!local.has(r.id)) await scheduleLocal(r.id, r.medication, r.times, r.durationDays);
  }
  if (server.length > 0) local = await readLocalGroups();

  if (online) {
    return server.map((r) => {
      const g = local.get(r.id);
      return {
        groupId: r.id,
        medication: r.medication,
        times: r.times,
        durationDays: r.durationDays,
        remaining: g?.remaining ?? 0,
        nextAt: g?.nextAt ?? null,
      };
    });
  }

  // Repli hors-ligne total : on montre ce qui est planifié localement.
  return Array.from(local.values()).sort((a, b) => (a.nextAt?.getTime() ?? Infinity) - (b.nextAt?.getTime() ?? Infinity));
}

/** Annule un rappel : désactivation serveur + annulation des notifications locales. */
export async function cancelReminderGroup(groupId: string): Promise<void> {
  // Désactivation serveur (ignore si id local / hors-ligne).
  await apiClient.delete(`/reminders/${groupId}`).catch(() => {});
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    const data = (n.content.data ?? {}) as Record<string, any>;
    if (data.type === REMINDER_TYPE && data.groupId === groupId) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

/** Représentation lisible d'une heure « HH:MM ». */
export function formatTime(h: number, m: number): string {
  return `${pad(h)}:${pad(m)}`;
}
