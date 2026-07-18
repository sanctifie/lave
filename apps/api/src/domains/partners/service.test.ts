import { describe, it, expect, vi } from 'vitest';
import { PartnerService } from './service';

function setup(over: Record<string, any> = {}) {
  const repo = {
    findByStaff: vi.fn().mockResolvedValue({ id: 'partner1' }),
    listProducts: vi.fn().mockResolvedValue([{ id: 'p1', name: 'Doliprane' }]),
    findProductByBarcode: vi.fn().mockResolvedValue({ id: 'p1', name: 'Doliprane', barcode: '123' }),
    findProductById: vi.fn().mockResolvedValue({ id: 'p1', partnerId: 'partner1' }),
    createProduct: vi.fn().mockImplementation((pid: string, d: any) => Promise.resolve({ id: 'new', partnerId: pid, ...d })),
    updateProduct: vi.fn().mockResolvedValue({ id: 'p1', name: 'MAJ' }),
    deleteProduct: vi.fn().mockResolvedValue(undefined),
    updateDuty: vi.fn().mockResolvedValue({ id: 'partner1', isOnDuty: true }),
    ...over,
  };
  return { repo, service: new PartnerService(repo as any) };
}

describe('PartnerService — catalogue', () => {
  it('403 si le staff n\'est rattaché à aucune pharmacie', async () => {
    const { service } = setup({ findByStaff: vi.fn().mockResolvedValue(null) });
    await expect(service.listProducts('u1', {})).rejects.toMatchObject({ statusCode: 403 });
  });

  it('liste les produits de la pharmacie du staff', async () => {
    const { service, repo } = setup();
    const res = await service.listProducts('u1', { q: 'doli' });
    expect(repo.listProducts).toHaveBeenCalledWith('partner1', { q: 'doli' });
    expect(res).toHaveLength(1);
  });

  it('recherche par code-barres — 404 si absent', async () => {
    const { service } = setup({ findProductByBarcode: vi.fn().mockResolvedValue(null) });
    await expect(service.findByBarcode('u1', '000')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('crée un produit rattaché à la pharmacie', async () => {
    const { service, repo } = setup();
    const res = await service.createProduct('u1', { name: 'Vitamine C', priceFcfa: 1500 } as any);
    expect(repo.createProduct).toHaveBeenCalledWith('partner1', { name: 'Vitamine C', priceFcfa: 1500 });
    expect(res).toMatchObject({ partnerId: 'partner1' });
  });

  it('refuse de modifier le produit d\'une autre pharmacie (403)', async () => {
    const { service } = setup({ findProductById: vi.fn().mockResolvedValue({ id: 'p1', partnerId: 'autre' }) });
    await expect(service.updateProduct('u1', 'p1', { priceFcfa: 2000 } as any)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('404 si le produit à supprimer est introuvable', async () => {
    const { service } = setup({ findProductById: vi.fn().mockResolvedValue(null) });
    await expect(service.deleteProduct('u1', 'x')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('bascule le statut de garde', async () => {
    const { service, repo } = setup();
    const res = await service.updateDuty('u1', { isOnDuty: true });
    expect(repo.updateDuty).toHaveBeenCalledWith('partner1', { isOnDuty: true });
    expect(res).toMatchObject({ isOnDuty: true });
  });
});
