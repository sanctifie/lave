import { describe, it, expect, vi } from 'vitest';

vi.mock('../../infrastructure/prisma/client', () => ({ prisma: {} }));

import { CareLinkService } from './service';
import { CareLinkStatus, UserRole } from '@mbolo/shared';

function make(over: Record<string, any> = {}) {
  const repo = {
    findUserByPhone: vi.fn(),
    findById:        vi.fn(),
    findPair:        vi.fn().mockResolvedValue(null),
    create:          vi.fn().mockImplementation((c: string, p: string) => Promise.resolve({ id: 'l1', caregiverId: c, patientId: p, status: 'pending' })),
    reinvite:        vi.fn().mockResolvedValue({ id: 'l1', status: 'pending' }),
    setStatus:       vi.fn().mockImplementation((id: string, status: string) => Promise.resolve({ id, status })),
    listForPatient:  vi.fn().mockResolvedValue([]),
    listForCaregiver:vi.fn().mockResolvedValue([]),
    acceptedLink:    vi.fn().mockResolvedValue(null),
    ordersForPatient:vi.fn().mockResolvedValue([]),
    ...over,
  };
  const notif = { send: vi.fn().mockResolvedValue(undefined) };
  const service = new CareLinkService(repo as any, notif as any);
  return { service, repo, notif };
}

describe('CareLinkService.invite', () => {
  it('404 si aucun compte au numéro', async () => {
    const { service } = make({ findUserByPhone: vi.fn().mockResolvedValue(null) });
    await expect(service.invite('p1', '24106')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('422 si le numéro n\'est pas un compte accompagnant', async () => {
    const { service } = make({
      findUserByPhone: vi.fn().mockResolvedValue({ id: 'c1', role: UserRole.PATIENT, isActive: true }),
    });
    await expect(service.invite('p1', '24106')).rejects.toMatchObject({ statusCode: 422 });
  });

  it('409 si un lien accepté existe déjà', async () => {
    const { service } = make({
      findUserByPhone: vi.fn().mockResolvedValue({ id: 'c1', role: UserRole.ACCOMPAGNANT, isActive: true }),
      findPair:        vi.fn().mockResolvedValue({ id: 'l1', status: CareLinkStatus.ACCEPTED }),
    });
    await expect(service.invite('p1', '24106')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('crée un lien pending et notifie l\'accompagnant', async () => {
    const { service, repo, notif } = make({
      findUserByPhone: vi.fn().mockResolvedValue({ id: 'c1', role: UserRole.ACCOMPAGNANT, isActive: true }),
    });
    const link = await service.invite('p1', '24106');
    expect(link.status).toBe('pending');
    expect(repo.create).toHaveBeenCalledWith('c1', 'p1');
    expect(notif.send).toHaveBeenCalled();
  });

  it('relance un lien révoqué au lieu d\'un doublon', async () => {
    const { service, repo } = make({
      findUserByPhone: vi.fn().mockResolvedValue({ id: 'c1', role: UserRole.ACCOMPAGNANT, isActive: true }),
      findPair:        vi.fn().mockResolvedValue({ id: 'lOld', status: CareLinkStatus.REVOKED }),
    });
    await service.invite('p1', '24106');
    expect(repo.reinvite).toHaveBeenCalledWith('lOld');
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe('CareLinkService.accept', () => {
  it('403 si l\'invitation ne s\'adresse pas à cet accompagnant', async () => {
    const { service } = make({ findById: vi.fn().mockResolvedValue({ id: 'l1', caregiverId: 'autre', status: 'pending' }) });
    await expect(service.accept('l1', 'c1')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('422 si l\'invitation est déjà traitée', async () => {
    const { service } = make({ findById: vi.fn().mockResolvedValue({ id: 'l1', caregiverId: 'c1', status: 'accepted' }) });
    await expect(service.accept('l1', 'c1')).rejects.toMatchObject({ statusCode: 422 });
  });

  it('passe le lien à accepted', async () => {
    const { service, repo } = make({ findById: vi.fn().mockResolvedValue({ id: 'l1', caregiverId: 'c1', status: 'pending' }) });
    const res = await service.accept('l1', 'c1');
    expect(res.status).toBe(CareLinkStatus.ACCEPTED);
    expect(repo.setStatus).toHaveBeenCalledWith('l1', CareLinkStatus.ACCEPTED);
  });
});

describe('CareLinkService.revoke', () => {
  it('403 si l\'user n\'est ni patient ni aidant du lien', async () => {
    const { service } = make({ findById: vi.fn().mockResolvedValue({ id: 'l1', caregiverId: 'c1', patientId: 'p1', status: 'accepted' }) });
    await expect(service.revoke('l1', 'intrus')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('le patient peut révoquer', async () => {
    const { service, repo } = make({ findById: vi.fn().mockResolvedValue({ id: 'l1', caregiverId: 'c1', patientId: 'p1', status: 'accepted' }) });
    await service.revoke('l1', 'p1');
    expect(repo.setStatus).toHaveBeenCalledWith('l1', CareLinkStatus.REVOKED);
  });
});

describe('CareLinkService.patientOrders', () => {
  it('403 sans lien accepté', async () => {
    const { service } = make({ acceptedLink: vi.fn().mockResolvedValue(null) });
    await expect(service.patientOrders('c1', 'p1')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('renvoie les commandes si le lien est accepté', async () => {
    const { service, repo } = make({
      acceptedLink:     vi.fn().mockResolvedValue({ id: 'l1' }),
      ordersForPatient: vi.fn().mockResolvedValue([{ id: 'o1' }]),
    });
    const res = await service.patientOrders('c1', 'p1');
    expect(res).toHaveLength(1);
    expect(repo.ordersForPatient).toHaveBeenCalledWith('p1');
  });
});
