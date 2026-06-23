import { PricingRepository } from './repository';
import { UpsertPricingInput } from './schema';
import { PricingKind } from '@mbolo/shared';

export class PricingService {
  constructor(private readonly repo: PricingRepository) {}

  async getAll() {
    return this.repo.getAll();
  }

  async upsert(input: UpsertPricingInput, updatedBy: string) {
    return this.repo.upsert(input.kind as PricingKind, input.valueFcfa, input.valueNum, updatedBy);
  }

  async computeVideoFeeFcfa(durationSeconds: number): Promise<number> {
    const [rateEntry, fxEntry] = await Promise.all([
      this.repo.getByKind(PricingKind.VIDEO_USD_PER_PARTICIPANT_MIN),
      this.repo.getByKind(PricingKind.USD_TO_FCFA_RATE),
    ]);

    const rateUsd = Number(rateEntry?.valueNum ?? 0.00099);
    const fxRate = Number(fxEntry?.valueNum ?? 600);
    const minutes = Math.ceil(durationSeconds / 60);
    return Math.ceil(minutes * 2 * rateUsd * fxRate);
  }
}
