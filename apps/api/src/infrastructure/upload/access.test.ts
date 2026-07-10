import { describe, it, expect } from 'vitest';
import { decideMediaAccess } from './access';
import { UserRole, PrescriptionSource } from '@mbolo/shared';

const media = { uploadedById: 'patientA', refTable: 'prescriptions', refId: 'rx1' };
const rx = {
  patientId: 'patientA',
  issuedById: 'doctorX',
  targetPartnerId: 'partner1',
  source: PrescriptionSource.MANUAL as string,
};

describe('decideMediaAccess', () => {
  it('autorise l\'admin sur n\'importe quel fichier', () => {
    expect(
      decideMediaAccess({ requester: { userId: 'z', role: UserRole.ADMIN }, media, prescription: rx }),
    ).toBe(true);
  });

  it('autorise l\'uploadeur (patient propriétaire)', () => {
    expect(
      decideMediaAccess({ requester: { userId: 'patientA', role: UserRole.PATIENT }, media, prescription: rx }),
    ).toBe(true);
  });

  it('REFUSE un autre patient (défense contre l\'accès horizontal)', () => {
    expect(
      decideMediaAccess({ requester: { userId: 'patientB', role: UserRole.PATIENT }, media, prescription: rx }),
    ).toBe(false);
  });

  it('autorise le médecin émetteur de l\'ordonnance', () => {
    expect(
      decideMediaAccess({ requester: { userId: 'doctorX', role: UserRole.DOCTOR }, media, prescription: rx }),
    ).toBe(true);
  });

  it('autorise le pharmacien de l\'officine cible', () => {
    expect(
      decideMediaAccess({
        requester: { userId: 'pharma1', role: UserRole.PARTNER_STAFF, partnerProfileId: 'partner1' },
        media,
        prescription: rx,
      }),
    ).toBe(true);
  });

  it('REFUSE un pharmacien d\'une autre officine', () => {
    expect(
      decideMediaAccess({
        requester: { userId: 'pharma2', role: UserRole.PARTNER_STAFF, partnerProfileId: 'partner2' },
        media,
        prescription: rx,
      }),
    ).toBe(false);
  });

  it('autorise tout pharmacien si ordonnance de téléconsultation sans officine cible', () => {
    const teleRx = { ...rx, targetPartnerId: null, source: PrescriptionSource.TELECONSULTATION as string };
    expect(
      decideMediaAccess({
        requester: { userId: 'pharma2', role: UserRole.PARTNER_STAFF, partnerProfileId: 'partner2' },
        media,
        prescription: teleRx,
      }),
    ).toBe(true);
  });

  it('REFUSE si l\'ordonnance liée est introuvable', () => {
    expect(
      decideMediaAccess({ requester: { userId: 'patientB', role: UserRole.PATIENT }, media, prescription: null }),
    ).toBe(false);
  });
});
