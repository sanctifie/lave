import { HTTP } from '../../lib/errors';
import { DoctorRepository } from './repository';
import { RegisterDoctorInput, UpdateProfileInput, UpdateScheduleInput } from './schema';

const SLOT_DURATION_MIN = 30;

export class DoctorService {
  constructor(private readonly repo: DoctorRepository) {}

  async list(params: { specialty?: string; availableNow?: boolean } = {}) {
    if (params.availableNow) return this.repo.listAvailableNow(params.specialty);
    return this.repo.listVerified(params.specialty);
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

  async countAvailableNow(specialty?: string) {
    return this.repo.countAvailableNow(specialty);
  }

  async setAvailability(userId: string, isAvailableNow: boolean) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw HTTP.notFound('Profil médecin introuvable');
    return this.repo.setAvailability(userId, isAvailableNow);
  }

  async getMyProfile(userId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw HTTP.notFound('Profil médecin introuvable');
    const availabilities = await this.repo.getAvailabilitiesForDoctor(profile.id);
    return { ...profile, availabilities };
  }

  async updateMyProfile(userId: string, data: UpdateProfileInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw HTTP.notFound('Profil médecin introuvable');
    return this.repo.updateProfile(userId, data);
  }

  async updateSchedule(userId: string, input: UpdateScheduleInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw HTTP.notFound('Profil médecin introuvable');
    return this.repo.replaceSchedule(profile.id, input.slots);
  }

  async listSpecialties() {
    return this.repo.listSpecialties();
  }

  /**
   * Génère les créneaux de 30 min disponibles pour un médecin sur une date donnée.
   * Exclut les créneaux déjà réservés.
   */
  async getSlots(doctorId: string, dateStr: string) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) throw HTTP.unprocessable('Date invalide');

    const doctor = await this.repo.findById(doctorId);
    if (!doctor) throw HTTP.notFound('Médecin introuvable');

    // 0 = dimanche, 1 = lundi … en JS (dayOfWeek dans DB aussi)
    const dayOfWeek = date.getDay();
    const availabilities = await this.repo.getAvailabilitiesForDoctor(doctorId);
    const todayAvail = (availabilities as any[]).filter((a: any) => a.dayOfWeek === dayOfWeek);

    if (todayAvail.length === 0) return [];

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const booked = await this.repo.getBookedSlots(doctorId, dayStart, dayEnd);
    const bookedMs = new Set((booked as any[]).map((b: any) => b.scheduledAt?.getTime()));

    const slots: { datetime: string; available: boolean }[] = [];

    for (const avail of todayAvail as any[]) {
      const [startH, startM] = (avail.startTimeUtc as string).split(':').map(Number);
      const [endH, endM]     = (avail.endTimeUtc as string).split(':').map(Number);

      const slotStart = new Date(date);
      slotStart.setUTCHours(startH, startM, 0, 0);
      const slotEnd = new Date(date);
      slotEnd.setUTCHours(endH, endM, 0, 0);

      let cursor = new Date(slotStart);
      while (cursor < slotEnd) {
        const available = !bookedMs.has(cursor.getTime()) && cursor > new Date();
        slots.push({ datetime: cursor.toISOString(), available });
        cursor = new Date(cursor.getTime() + SLOT_DURATION_MIN * 60 * 1000);
      }
    }

    return slots;
  }
}
