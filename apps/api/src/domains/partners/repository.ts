import { prisma } from '../../infrastructure/prisma/client';
import { PartnerType } from '@mbolo/shared';
import { CreatePartnerInput } from './schema';

export class PartnerRepository {
  async list(type?: PartnerType) {
    return prisma.partnerProfile.findMany({
      where: { isActive: true, ...(type && { type }) },
    });
  }

  async findById(id: string) {
    return prisma.partnerProfile.findUnique({ where: { id } });
  }

  async create(data: CreatePartnerInput) {
    return prisma.partnerProfile.create({ data });
  }
}
