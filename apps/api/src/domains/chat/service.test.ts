import { describe, it, expect, vi, beforeEach } from 'vitest';

// La repository importe le client Prisma au chargement du module — on le neutralise
// pour pouvoir tester la logique d'autorisation sans base de données.
vi.mock('../../infrastructure/prisma/client', () => ({ prisma: {} }));

import { ChatService } from './service';
import { UserRole } from '@mbolo/shared';

function makeRepo(overrides: Record<string, any> = {}) {
  return {
    resolveParticipants: vi.fn(),
    getOrCreate:         vi.fn().mockResolvedValue({ id: 'conv1', refTable: 'appointment', refId: 'a1' }),
    findById:            vi.fn().mockResolvedValue({ id: 'conv1', refTable: 'appointment', refId: 'a1' }),
    listMessages:        vi.fn().mockResolvedValue([]),
    send:                vi.fn().mockResolvedValue({ id: 'msg1' }),
    ...overrides,
  };
}

const input = { refTable: 'appointment', refId: 'a1' };

describe('ChatService — autorisation', () => {
  let repo: ReturnType<typeof makeRepo>;
  let service: ChatService;

  beforeEach(() => {
    repo = makeRepo();
    service = new ChatService(repo as any);
  });

  it('autorise un participant légitime', async () => {
    repo.resolveParticipants.mockResolvedValue(['patient1', 'doctor1']);
    const conv = await service.getOrCreate(input, 'patient1', UserRole.PATIENT);
    expect(conv).toEqual(expect.objectContaining({ id: 'conv1' }));
    expect(repo.getOrCreate).toHaveBeenCalledWith('appointment', 'a1');
  });

  it('refuse un utilisateur non participant (403)', async () => {
    repo.resolveParticipants.mockResolvedValue(['patient1', 'doctor1']);
    await expect(service.getOrCreate(input, 'intrus99', UserRole.PATIENT))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(repo.getOrCreate).not.toHaveBeenCalled();
  });

  it('renvoie 404 si l\'entité référencée est introuvable', async () => {
    repo.resolveParticipants.mockResolvedValue(null);
    await expect(service.getOrCreate(input, 'patient1', UserRole.PATIENT))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('laisse passer un ADMIN sans vérifier les participants', async () => {
    await service.getOrCreate(input, 'admin1', UserRole.ADMIN);
    expect(repo.resolveParticipants).not.toHaveBeenCalled();
    expect(repo.getOrCreate).toHaveBeenCalled();
  });

  it('bloque la lecture des messages pour un non participant', async () => {
    repo.resolveParticipants.mockResolvedValue(['patient1', 'doctor1']);
    await expect(service.listMessages('conv1', 'intrus99', UserRole.PATIENT))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(repo.listMessages).not.toHaveBeenCalled();
  });

  it('renvoie 404 si la conversation n\'existe pas', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.listMessages('inconnu', 'patient1', UserRole.PATIENT))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it('autorise l\'envoi d\'un message par un participant', async () => {
    repo.resolveParticipants.mockResolvedValue(['patient1', 'doctor1']);
    const msg = await service.send('conv1', 'doctor1', UserRole.DOCTOR, { body: 'Bonjour' });
    expect(msg).toEqual(expect.objectContaining({ id: 'msg1' }));
    expect(repo.send).toHaveBeenCalledWith('conv1', 'doctor1', 'Bonjour');
  });
});
