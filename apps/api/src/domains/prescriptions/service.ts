import { HTTP } from '../../lib/errors';
import { PrescriptionRepository } from './repository';
import { CreatePrescriptionInput, ValidatePrescriptionInput, IssuePrescriptionInput } from './schema';

export class PrescriptionService {
  constructor(private readonly repo: PrescriptionRepository) {}

  async create(patientId: string, data: CreatePrescriptionInput) {
    return this.repo.create(patientId, { type: data.type });
    // TODO étape 4 : lier les mediaIds (upload S3/local)
  }

  async getById(id: string, requesterId: string) {
    const rx = await this.repo.findById(id);
    if (!rx) throw HTTP.notFound('Ordonnance introuvable');
    if (rx.patientId !== requesterId) throw HTTP.forbidden();
    return rx;
  }

  async listMine(patientId: string) {
    return this.repo.listForPatient(patientId);
  }

  async validate(id: string, pharmacistId: string, input: ValidatePrescriptionInput) {
    const rx = await this.repo.findById(id);
    if (!rx) throw HTTP.notFound('Ordonnance introuvable');

    if (input.approved) {
      return this.repo.validate(id, pharmacistId);
    }
    if (!input.rejectionReason) throw HTTP.unprocessable('Motif de refus requis');
    return this.repo.reject(id, pharmacistId, input.rejectionReason);
  }

  async issueFromConsultation(doctorUserId: string, _input: IssuePrescriptionInput) {
    // TODO étape 4 (téléconsultation) : lier consultation + patient + médecin
    void doctorUserId;
    throw HTTP.unprocessable('Non implémenté — voir étape 4');
  }
}
