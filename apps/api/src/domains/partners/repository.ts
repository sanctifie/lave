import { prisma } from '../../infrastructure/prisma/client';
import { PartnerType } from '@mbolo/shared';
import { CreatePartnerInput, CreateProductInput, UpdateProductInput, UpdateDutyInput } from './schema';

export class PartnerRepository {
  async list(type?: PartnerType) {
    return prisma.partnerProfile.findMany({
      where: { isActive: true, ...(type && { type }) },
      // Pharmacies de garde mises en avant.
      orderBy: [{ isOnDuty: 'desc' }, { legalName: 'asc' }],
    });
  }

  async findById(id: string) {
    return prisma.partnerProfile.findUnique({ where: { id } });
  }

  async create(data: CreatePartnerInput) {
    return prisma.partnerProfile.create({ data });
  }

  /** Résout la pharmacie rattachée à un membre du personnel. */
  async findByStaff(userId: string) {
    return prisma.partnerProfile.findFirst({ where: { staff: { some: { id: userId } } } });
  }

  // ── Garde & vitrine ────────────────────────────────────────────────────────
  async updateDuty(partnerId: string, data: UpdateDutyInput) {
    return prisma.partnerProfile.update({
      where: { id: partnerId },
      data: {
        ...(data.isOnDuty !== undefined ? { isOnDuty: data.isOnDuty } : {}),
        ...(data.openingHours !== undefined ? { openingHours: data.openingHours } : {}),
      },
    });
  }

  // ── Catalogue produits ─────────────────────────────────────────────────────
  async listProducts(partnerId: string, opts: { q?: string; adviceOnly?: boolean } = {}) {
    return prisma.pharmacyProduct.findMany({
      where: {
        partnerId,
        ...(opts.adviceOnly ? { isAdvice: true } : {}),
        ...(opts.q
          ? {
              OR: [
                { name: { contains: opts.q, mode: 'insensitive' } },
                { barcode: { contains: opts.q } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findProductByBarcode(partnerId: string, barcode: string) {
    return prisma.pharmacyProduct.findFirst({ where: { partnerId, barcode } });
  }

  async findProductById(id: string) {
    return prisma.pharmacyProduct.findUnique({ where: { id } });
  }

  async createProduct(partnerId: string, data: CreateProductInput) {
    return prisma.pharmacyProduct.create({
      data: {
        partnerId,
        name: data.name,
        barcode: data.barcode ?? null,
        priceFcfa: data.priceFcfa,
        inStock: data.inStock ?? true,
        isAdvice: data.isAdvice ?? false,
        sensitive: data.sensitive ?? false,
      },
    });
  }

  async updateProduct(id: string, data: UpdateProductInput) {
    return prisma.pharmacyProduct.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.barcode !== undefined ? { barcode: data.barcode } : {}),
        ...(data.priceFcfa !== undefined ? { priceFcfa: data.priceFcfa } : {}),
        ...(data.inStock !== undefined ? { inStock: data.inStock } : {}),
        ...(data.isAdvice !== undefined ? { isAdvice: data.isAdvice } : {}),
        ...(data.sensitive !== undefined ? { sensitive: data.sensitive } : {}),
      },
    });
  }

  async deleteProduct(id: string) {
    return prisma.pharmacyProduct.delete({ where: { id } });
  }
}
