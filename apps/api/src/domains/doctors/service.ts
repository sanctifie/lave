import { HTTP } from '../../lib/errors';
import { DoctorRepository } from './repository';
import { RegisterDoctorInput } from './schema';

export class DoctorService {
  constructor(private readonly repo: DoctorRepository) {}

  async list() {
    return this.repo.listVerified();
  }

  async getById(id: string) {
    const doctor = await this.repo.findById(id);
    if (!doctor) throw HTTP.notFound('Médecin introuvable');
    return doctor;
  }

  async register(userId: string, data: RegisterDoctorInput) {
    const existing = await this.repo.findByUserId(userId);
    if (existing) throw HTTP.conflict('Profil médecin déjà existant');
    return this.repo.create(userId, data);
  }

  async setAvailability(userId: string, isAvailableNow: boolean) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw HTTP.notFound('Profil médecin introuvable');
    return this.repo.setAvailability(userId, isAvailableNow);
  }

  async listAvailableNow() {
    return this.repo.listAvailableNow();
  }
}
