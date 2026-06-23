import { HTTP } from '../../lib/errors';
import { DeliveryRepository } from './repository';

export class DeliveryService {
  constructor(private readonly repo: DeliveryRepository) {}

  async getById(id: string) {
    const delivery = await this.repo.findById(id);
    if (!delivery) throw HTTP.notFound('Livraison introuvable');
    return delivery;
  }

  async listMine(courierId: string) {
    return this.repo.listForCourier(courierId);
  }

  async listPending() {
    return this.repo.listPending();
  }

  async assign(id: string, courierId: string) {
    return this.repo.assign(id, courierId);
  }

  async updateStatus(id: string, status: string, lat?: number, lng?: number) {
    return this.repo.updateStatus(id, status as Parameters<typeof this.repo.updateStatus>[1], lat, lng);
  }

  async confirmHandover(id: string, code: string) {
    const delivery = await this.repo.confirmHandover(id, code);
    if (!delivery) throw HTTP.unprocessable('Code de remise invalide');
    // TODO étape 4 : déclencher le release escrow
    return delivery;
  }
}
