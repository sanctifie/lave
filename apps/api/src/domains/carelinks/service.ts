import { HTTP } from '../../lib/errors';
import { CareLinkRepository } from './repository';
import { CareLinkStatus, UserRole } from '@mbolo/shared';
import type { NotificationService } from '../../infrastructure/providers/notification';

export class CareLinkService {
  constructor(
    private readonly repo: CareLinkRepository,
    private readonly notif?: NotificationService,
  ) {}

  /**
   * Le patient invite un accompagnant (par téléphone) à gérer son compte.
   * Le consentement est du côté patient : c'est LUI qui initie le lien.
   */
  async invite(patientUserId: string, caregiverPhone: string) {
    const caregiver = await this.repo.findUserByPhone(caregiverPhone);
    if (!caregiver) throw HTTP.notFound('Aucun compte à ce numéro');
    if (caregiver.role !== UserRole.ACCOMPAGNANT) {
      throw HTTP.unprocessable('Ce numéro n\'est pas un compte accompagnant');
    }
    if (!caregiver.isActive) throw HTTP.unprocessable('Ce compte accompagnant est désactivé');
    if (caregiver.id === patientUserId) throw HTTP.unprocessable('Vous ne pouvez pas vous inviter vous-même');

    const existing = await this.repo.findPair(caregiver.id, patientUserId);
    if (existing) {
      if (existing.status === CareLinkStatus.ACCEPTED) throw HTTP.conflict('Cet aidant gère déjà votre compte');
      if (existing.status === CareLinkStatus.PENDING)  throw HTTP.conflict('Invitation déjà envoyée');
      // Lien révoqué → on relance l'invitation sur le même enregistrement.
      const link = await this.repo.reinvite(existing.id);
      await this.notifyInvite(caregiverPhone);
      return link;
    }

    const link = await this.repo.create(caregiver.id, patientUserId);
    await this.notifyInvite(caregiverPhone);
    return link;
  }

  private async notifyInvite(caregiverPhone: string) {
    await this.notif?.send({
      to:      caregiverPhone,
      message: 'Un patient vous a désigné comme aidant sur MBOLO Santé. Ouvrez l\'app pour accepter et gérer son compte.',
    }).catch(() => {});
  }

  /** L'accompagnant accepte une invitation qui lui est adressée. */
  async accept(linkId: string, caregiverUserId: string) {
    const link = await this.repo.findById(linkId);
    if (!link) throw HTTP.notFound('Invitation introuvable');
    if (link.caregiverId !== caregiverUserId) throw HTTP.forbidden();
    if (link.status !== CareLinkStatus.PENDING) throw HTTP.unprocessable('Invitation déjà traitée');
    return this.repo.setStatus(linkId, CareLinkStatus.ACCEPTED);
  }

  /** Patient OU accompagnant peut rompre le lien à tout moment. */
  async revoke(linkId: string, userId: string) {
    const link = await this.repo.findById(linkId);
    if (!link) throw HTTP.notFound('Lien introuvable');
    if (link.patientId !== userId && link.caregiverId !== userId) throw HTTP.forbidden();
    if (link.status === CareLinkStatus.REVOKED) return link;
    return this.repo.setStatus(linkId, CareLinkStatus.REVOKED);
  }

  /** Vue combinée : aidants de l'user (côté patient) + patients gérés (côté aidant). */
  async listMine(userId: string) {
    const [asPatient, asCaregiver] = await Promise.all([
      this.repo.listForPatient(userId),
      this.repo.listForCaregiver(userId),
    ]);
    return {
      // « Mes aidants » : les accompagnants que j'ai invités.
      caregivers: asPatient.map((l) => ({
        id: l.id, userId: l.caregiverId, status: l.status, createdAt: l.createdAt,
        name: (l as any).caregiver?.name ?? '—', phone: (l as any).caregiver?.phone ?? null,
      })),
      // « Comptes que je gère » : les patients qui m'ont invité.
      patients: asCaregiver.map((l) => ({
        id: l.id, userId: l.patientId, status: l.status, createdAt: l.createdAt,
        name: (l as any).patient?.name ?? '—', phone: (l as any).patient?.phone ?? null,
      })),
    };
  }

  /** Commandes d'un patient géré — accès conditionné à un lien ACCEPTÉ. */
  async patientOrders(caregiverUserId: string, patientId: string) {
    const link = await this.repo.acceptedLink(caregiverUserId, patientId);
    if (!link) throw HTTP.forbidden('Aucun lien actif avec ce patient');
    return this.repo.ordersForPatient(patientId);
  }
}
