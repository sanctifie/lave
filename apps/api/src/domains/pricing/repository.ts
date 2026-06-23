import { prisma } from '../../infrastructure/prisma/client';
import { PricingKind } from '@mbolo/shared';

export class PricingRepository {
  async getAll() {
    return prisma.pricing.findMany();
  }

  async getByKind(kind: PricingKind) {
    return prisma.pricing.findUnique({ where: { kind } });
  }

  async upsert(kind: PricingKind, valueFcfa?: number, valueNum?: number, updatedBy?: string) {
    return prisma.pricing.upsert({
      where: { kind },
      update: { valueFcfa, valueNum, updatedBy },
      create: { kind, valueFcfa, valueNum, updatedBy },
    });
  }
}
