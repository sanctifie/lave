import { describe, it, expect, vi } from 'vitest';

vi.mock('../../infrastructure/prisma/client', () => ({ prisma: {} }));

import { NotificationService } from './service';

function make(over: Record<string, any> = {}) {
  const repo = {
    listForUser: vi.fn().mockResolvedValue([]),
    unreadCount: vi.fn().mockResolvedValue(3),
    findById: vi.fn(),
    markRead: vi.fn().mockResolvedValue({ id: 'n1', readAt: new Date() }),
    markAllRead: vi.fn().mockResolvedValue({ count: 5 }),
    ...over,
  };
  return { repo, service: new NotificationService(repo as any) };
}

describe('NotificationService.markRead', () => {
  it('404 si la notification est introuvable', async () => {
    const { service } = make({ findById: vi.fn().mockResolvedValue(null) });
    await expect(service.markRead('x', 'u1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('403 si la notification appartient à un autre utilisateur', async () => {
    const { service } = make({ findById: vi.fn().mockResolvedValue({ id: 'n1', userId: 'autre' }) });
    await expect(service.markRead('n1', 'u1')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('marque comme lue la notification de l\'utilisateur', async () => {
    const { service, repo } = make({ findById: vi.fn().mockResolvedValue({ id: 'n1', userId: 'u1' }) });
    await service.markRead('n1', 'u1');
    expect(repo.markRead).toHaveBeenCalledWith('n1');
  });
});

describe('NotificationService.markAllRead', () => {
  it('renvoie le nombre mis à jour', async () => {
    const { service } = make();
    expect(await service.markAllRead('u1')).toEqual({ updated: 5 });
  });
});

describe('NotificationService.unreadCount', () => {
  it('renvoie le compteur', async () => {
    const { service } = make();
    expect(await service.unreadCount('u1')).toBe(3);
  });
});
