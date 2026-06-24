import { HTTP } from '../../lib/errors';
import { PartnerRepository } from './repository';
import { CreatePartnerInput } from './schema';
import { PartnerType } from '@mbolo/shared';

export class PartnerService {
  constructor(private readonly repo: PartnerRepository) {}

  async list(type?: PartnerType) {
    const partners = await this.repo.list(type);
    // Expose `address` alias for mobile clients that read landmark as address
    return (partners as any[]).map((p: any) => ({ ...p, address: p.landmark as string }));
  }

  async getById(id: string) {
    const partner = await this.repo.findById(id);
    if (!partner) throw HTTP.notFound('Partenaire introuvable');
    return partner;
  }

  async create(data: CreatePartnerInput) {
    return this.repo.create(data);
  }
}
