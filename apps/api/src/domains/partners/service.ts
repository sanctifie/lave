import { HTTP } from '../../lib/errors';
import { PartnerRepository } from './repository';
import { CreatePartnerInput } from './schema';
import { PartnerType } from '@mbolo/shared';

export class PartnerService {
  constructor(private readonly repo: PartnerRepository) {}

  async list(type?: PartnerType) {
    return this.repo.list(type);
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
