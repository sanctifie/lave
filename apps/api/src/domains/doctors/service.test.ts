import { describe, it, expect, vi } from 'vitest';
import { DoctorService } from './service';

const DATE = '2030-06-05'; // date future (créneaux non passés)
const utcDay = new Date(DATE).getUTCDay();

function setup(opts: { avail?: any[]; booked?: any[] } = {}) {
  const repo = {
    findById:                   vi.fn().mockResolvedValue({ id: 'doc1' }),
    getAvailabilitiesForDoctor: vi.fn().mockResolvedValue(
      opts.avail ?? [{ dayOfWeek: utcDay, startTimeUtc: '08:00', endTimeUtc: '10:00' }],
    ),
    getBookedSlots:             vi.fn().mockResolvedValue(opts.booked ?? []),
  };
  return { repo, service: new DoctorService(repo as any) };
}

describe('DoctorService.getSlots', () => {
  it('génère des créneaux de 30 min sur la plage de disponibilité', async () => {
    const { service } = setup();
    const slots = await service.getSlots('doc1', DATE);
    expect(slots.map((s) => s.datetime)).toEqual([
      `${DATE}T08:00:00.000Z`,
      `${DATE}T08:30:00.000Z`,
      `${DATE}T09:00:00.000Z`,
      `${DATE}T09:30:00.000Z`,
    ]);
    expect(slots.every((s) => s.available)).toBe(true);
  });

  it('marque un créneau déjà réservé comme indisponible', async () => {
    const { service } = setup({ booked: [{ scheduledAt: new Date(`${DATE}T09:00:00.000Z`) }] });
    const slots = await service.getSlots('doc1', DATE);
    const booked = slots.find((s) => s.datetime === `${DATE}T09:00:00.000Z`);
    expect(booked!.available).toBe(false);
    expect(slots.filter((s) => s.available)).toHaveLength(3);
  });

  it('retourne une liste vide si aucune disponibilité ce jour-là', async () => {
    const { service } = setup({ avail: [{ dayOfWeek: (utcDay + 1) % 7, startTimeUtc: '08:00', endTimeUtc: '10:00' }] });
    expect(await service.getSlots('doc1', DATE)).toEqual([]);
  });

  it('rejette une date invalide (422)', async () => {
    const { service } = setup();
    await expect(service.getSlots('doc1', 'pas-une-date')).rejects.toMatchObject({ statusCode: 422 });
  });

  it('marque les créneaux passés comme indisponibles', async () => {
    const past = '2020-01-02';
    const pastDay = new Date(past).getUTCDay();
    const repo = {
      findById: vi.fn().mockResolvedValue({ id: 'doc1' }),
      getAvailabilitiesForDoctor: vi.fn().mockResolvedValue([{ dayOfWeek: pastDay, startTimeUtc: '08:00', endTimeUtc: '09:00' }]),
      getBookedSlots: vi.fn().mockResolvedValue([]),
    };
    const service = new DoctorService(repo as any);
    const slots = await service.getSlots('doc1', past);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => !s.available)).toBe(true);
  });
});
