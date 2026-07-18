import { HTTP } from '../../lib/errors';
import { PartnerRepository } from './repository';
import {
  CreatePartnerInput,
  CreateProductInput,
  UpdateProductInput,
  UpdateDutyInput,
} from './schema';
import { PartnerType } from '@mbolo/shared';

export class PartnerService {
  constructor(private readonly repo: PartnerRepository) {}

  async list(type?: PartnerType) {
    const partners = await this.repo.list(type);
    // Expose `address` alias for mobile clients that read landmark as address
    return (partners as any[]).map((p: any) => ({ ...p, address: p.landmark as string }));
  }

  async getById(id: string) {
    const partner = await this.repo.findById(id);
    if (!partner) throw HTTP.notFound('Partenaire introuvable');
    return partner;
  }

  async create(data: CreatePartnerInput) {
    return this.repo.create(data);
  }

  /** Résout la pharmacie du membre du personnel, ou 403. */
  private async requirePartner(userId: string) {
    const partner = await this.repo.findByStaff(userId);
    if (!partner) throw HTTP.forbidden("Vous n'êtes rattaché à aucun partenaire");
    return partner;
  }

  /** Profil de la pharmacie du membre du personnel connecté. */
  async getMine(userId: string) {
    return this.requirePartner(userId);
  }

  // ── Garde & vitrine ────────────────────────────────────────────────────────
  async updateDuty(userId: string, data: UpdateDutyInput) {
    const partner = await this.requirePartner(userId);
    return this.repo.updateDuty(partner.id, data);
  }

  // ── Catalogue produits (poste de dispensation) ─────────────────────────────
  async listProducts(userId: string, opts: { q?: string; adviceOnly?: boolean }) {
    const partner = await this.requirePartner(userId);
    return this.repo.listProducts(partner.id, opts);
  }

  async findByBarcode(userId: string, barcode: string) {
    const partner = await this.requirePartner(userId);
    const product = await this.repo.findProductByBarcode(partner.id, barcode);
    if (!product) throw HTTP.notFound('Aucun produit avec ce code-barres');
    return product;
  }

  async createProduct(userId: string, data: CreateProductInput) {
    const partner = await this.requirePartner(userId);
    return this.repo.createProduct(partner.id, data);
  }

  async updateProduct(userId: string, productId: string, data: UpdateProductInput) {
    const partner = await this.requirePartner(userId);
    const product = await this.repo.findProductById(productId);
    if (!product) throw HTTP.notFound('Produit introuvable');
    if (product.partnerId !== partner.id) throw HTTP.forbidden();
    return this.repo.updateProduct(productId, data);
  }

  async deleteProduct(userId: string, productId: string) {
    const partner = await this.requirePartner(userId);
    const product = await this.repo.findProductById(productId);
    if (!product) throw HTTP.notFound('Produit introuvable');
    if (product.partnerId !== partner.id) throw HTTP.forbidden();
    await this.repo.deleteProduct(productId);
    return { deleted: true };
  }
}
