import { HTTP } from '../../lib/errors';
import { ReviewRepository } from './repository';
import { CreateReviewInput } from './schema';
import type { AiProvider } from '../../infrastructure/providers/ai';

export class ReviewService {
  constructor(
    private readonly repo: ReviewRepository,
    private readonly ai?: AiProvider,
  ) {}

  async create(authorId: string, input: CreateReviewInput) {
    // Anti-avis fictif : l'auteur doit avoir réellement consommé le service.
    const eligible = await this.isEligible(authorId, input.refTable, input.refId);
    if (!eligible) {
      throw HTTP.forbidden('Vous ne pouvez noter qu\'un service que vous avez réellement utilisé.');
    }
    // Un seul avis par cible et par auteur (mise à jour possible plus tard).
    const existing = await this.repo.findExisting(authorId, input.refTable, input.refId);
    if (existing) throw HTTP.conflict('Vous avez déjà noté ce service.');

    // Modération IA (claude-haiku-4-5) du commentaire : ne bloque jamais la
    // création, se contente de signaler pour revue humaine. Sans IA → non signalé.
    let moderation: { flagged: boolean; moderationNote: string | null } | undefined;
    if (input.comment && this.ai) {
      const r = await this.ai.moderateReview(input.comment).catch(() => ({ flagged: false, reason: null }));
      moderation = { flagged: r.flagged, moderationNote: r.reason };
    }

    return this.repo.create(authorId, input, moderation);
  }

  /** Admin : file des avis signalés par la modération IA. */
  listFlagged() {
    return this.repo.listFlagged();
  }

  /** Admin : lève le signalement (avis conservé) ou supprime l'avis. */
  async moderate(id: string, action: 'approve' | 'remove') {
    if (action === 'remove') return this.repo.remove(id);
    return this.repo.clearFlag(id);
  }

  private async isEligible(authorId: string, refTable: string, refId: string): Promise<boolean> {
    if (refTable === 'partner_profiles') {
      return (await this.repo.hasDeliveredOrderWithPartner(authorId, refId)) > 0;
    }
    if (refTable === 'couriers') {
      return (await this.repo.hasDeliveryWithCourier(authorId, refId)) > 0;
    }
    if (refTable === 'doctor_profiles') {
      return (await this.repo.hasCompletedConsultationWithDoctor(authorId, refId)) > 0;
    }
    return false;
  }

  summary(refTable: string, refId: string) {
    return this.repo.summary(refTable, refId);
  }
}
