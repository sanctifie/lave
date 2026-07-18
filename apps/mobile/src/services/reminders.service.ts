import * as Notifications from 'expo-notifications';

/**
 * Rappels de prise — 100 % locaux (aucune donnée de santé n'quitte l'appareil).
 * Les notifications planifiées d'expo-notifications font office de source de
 * vérité : on n'a pas de store à maintenir, on relit le planning à la demande.
 */

export interface ReminderGroup {
  /** Identifiant commun à toutes les occurrences d'un même rappel. */
  groupId: string;
  medication: string;
  times: string[];      // ex. ['08:00', '20:00']
  durationDays: number;
  /** Nombre d'occurrences encore planifiées (à venir). */
  remaining: number;
  /** Prochaine échéance planifiée, si connue. */
  nextAt: Date | null;
}

const REMINDER_TYPE = 'medication_reminder';

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

/** Programme des rappels quotidiens pour un médicament, sur `durationDays` jours. */
export async function scheduleMedicationReminders(params: {
  medication: string;
  times: string[];       // ['HH:MM', …]
  durationDays: number;
}): Promise<{ groupId: string; scheduled: number }> {
  const { medication, times, durationDays } = params;
  const groupId = `rem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date();
  let scheduled = 0;

  for (let day = 0; day < durationDays; day++) {
    for (const t of times) {
      const [h, m] = t.split(':').map((x) => parseInt(x, 10));
      if (Number.isNaN(h) || Number.isNaN(m)) continue;
      const when = new Date(now);
      when.setDate(now.getDate() + day);
      when.setHours(h, m, 0, 0);
      // On ignore les occurrences déjà passées (aujourd'hui, heure dépassée).
      if (when.getTime() <= now.getTime() + 1000) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💊 Rappel de prise',
          body: `C'est l'heure de prendre : ${medication}`,
          data: { type: REMINDER_TYPE, groupId, medication, times, durationDays },
        },
        // Déclencheur à une date précise (format compatible expo-notifications 0.28).
        trigger: { date: when },
      });
      scheduled++;
    }
  }
  return { groupId, scheduled };
}

/** Relit toutes les notifications planifiées et regroupe les rappels de prise. */
export async function listReminders(): Promise<ReminderGroup[]> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const groups = new Map<string, ReminderGroup>();

  for (const n of all) {
    const data = (n.content.data ?? {}) as Record<string, any>;
    if (data.type !== REMINDER_TYPE || !data.groupId) continue;

    const trigger = n.trigger as any;
    const at: Date | null =
      trigger?.date != null
        ? new Date(trigger.date)
        : trigger?.value != null
          ? new Date(trigger.value)
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

  return Array.from(groups.values()).sort((a, b) => {
    const ta = a.nextAt?.getTime() ?? Infinity;
    const tb = b.nextAt?.getTime() ?? Infinity;
    return ta - tb;
  });
}

/** Annule toutes les occurrences d'un rappel. */
export async function cancelReminderGroup(groupId: string): Promise<void> {
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
