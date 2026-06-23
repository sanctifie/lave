import { HTTP } from '../../lib/errors';
import { OrderRepository } from './repository';
import { PrescriptionRepository } from '../prescriptions/repository';
import { CreateOrderInput } from './schema';
import { PrescriptionStatus, OrderStatus } from '@mbolo/shared';

export class OrderService {
  constructor(
    private readonly repo: OrderRepository,
    private readonly rxRepo: PrescriptionRepository,
  ) {}

  async create(patientId: string, input: CreateOrderInput) {
    const rx = await this.rxRepo.findById(input.prescriptionId);
    if (!rx) throw HTTP.notFound('Ordonnance introuvable');
    if (rx.patientId !== patientId) throw HTTP.forbidden();
    if (rx.status !== PrescriptionStatus.VALIDATED) {
      throw HTTP.unprocessable('L\'ordonnance doit être validée par le pharmacien avant commande');
    }

    const totalFcfa = input.items.reduce((sum, i) => sum + i.quantity * i.unitPriceFcfa, 0);
    // TODO étape 4 : charger serviceFeeFcfa depuis la table pricing
    const serviceFeeFcfa = 500;

    return this.repo.create(patientId, { ...input, totalFcfa, serviceFeeFcfa });
  }

  async getById(id: string, requesterId: string) {
    const order = await this.repo.findById(id);
    if (!order) throw HTTP.notFound('Commande introuvable');
    if (order.patientId !== requesterId) throw HTTP.forbidden();
    return order;
  }

  async listMine(patientId: string) {
    return this.repo.listForPatient(patientId);
  }

  async updateStatus(id: string, status: OrderStatus) {
    return this.repo.updateStatus(id, status);
  }
}
