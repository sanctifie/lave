import { HTTP } from '../../lib/errors';
import { ReviewRepository } from './repository';
import { CreateReviewInput } from './schema';

export class ReviewService {
  constructor(private readonly repo: ReviewRepository) {}

  async create(authorId: string, input: CreateReviewInput) {
    // Anti-avis fictif : l'auteur doit avoir réellement consommé le service.
    const eligible = await this.isEligible(authorId, input.refTable, input.refId);
    if (!eligible) {
      throw HTTP.forbidden('Vous ne pouvez noter qu\'un service que vous avez réellement utilisé.');
    }
    // Un seul avis par cible et par auteur (mise à jour possible plus tard).
    const existing = await this.repo.findExisting(authorId, input.refTable, input.refId);
    if (existing) throw HTTP.conflict('Vous avez déjà noté ce service.');

    return this.repo.create(authorId, input);
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
