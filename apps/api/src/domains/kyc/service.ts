import { promises as fs } from 'fs';
import path from 'path';
import { HTTP } from '../../lib/errors';
import { prisma } from '../../infrastructure/prisma/client';
import { MediaKind, VerificationStatus, UserRole } from '@mbolo/shared';
import type { AiProvider } from '../../infrastructure/providers/ai';

export type KycType = 'partner' | 'doctor' | 'courier';

const TABLE: Record<KycType, string> = {
  partner: 'partner_profiles',
  doctor:  'doctor_profiles',
  courier: 'couriers',
};

const DOC_KIND: Record<KycType, MediaKind> = {
  partner: MediaKind.ID_DOCUMENT,
  doctor:  MediaKind.DOCTOR_CREDENTIAL,
  courier: MediaKind.ID_DOCUMENT,
};

export class KycService {
  constructor(private readonly ai?: AiProvider) {}

  /** Résout le profil (et sa table KYC) du demandeur selon son rôle. */
  private async resolveProfile(userId: string, role: string): Promise<{ type: KycType; id: string }> {
    if (role === UserRole.DOCTOR) {
      const d = await prisma.doctorProfile.findUnique({ where: { userId }, select: { id: true } });
      if (!d) throw HTTP.notFound('Profil médecin introuvable');
      return { type: 'doctor', id: d.id };
    }
    if (role === UserRole.COURIER) {
      const c = await prisma.courier.upsert({ where: { userId }, update: {}, create: { userId }, select: { id: true } });
      return { type: 'courier', id: c.id };
    }
    if (role === UserRole.PARTNER_STAFF) {
      const p = await prisma.partnerProfile.findFirst({ where: { staff: { some: { id: userId } } }, select: { id: true } });
      if (!p) throw HTTP.forbidden('Vous n\'êtes rattaché à aucun partenaire');
      return { type: 'partner', id: p.id };
    }
    throw HTTP.forbidden('Rôle non éligible au dépôt KYC');
  }

  /** Dépôt d'un justificatif KYC par le partenaire / médecin / coursier. */
  async uploadDocument(userId: string, role: string, file?: { filename: string; mimetype: string }) {
    if (!file) throw HTTP.unprocessable('Aucun fichier reçu');
    const { type, id } = await this.resolveProfile(userId, role);
    return prisma.media.create({
      data: {
        kind: DOC_KIND[type],
        url: `/uploads/${file.filename}`,
        mimeType: file.mimetype,
        uploadedById: userId,
        refTable: TABLE[type],
        refId: id,
      },
    });
  }

  // ── Admin ────────────────────────────────────────────────────────────────
  async listPending() {
    const [partners, doctors, couriers] = await Promise.all([
      prisma.partnerProfile.findMany({
        where: { verificationStatus: VerificationStatus.PENDING_VERIFICATION },
        select: { id: true, legalName: true, phone: true, verificationStatus: true },
      }),
      prisma.doctorProfile.findMany({
        where: { verificationStatus: VerificationStatus.PENDING_VERIFICATION },
        select: { id: true, verificationStatus: true, user: { select: { name: true, phone: true } } },
      }),
      prisma.courier.findMany({
        where: { verificationStatus: VerificationStatus.PENDING_VERIFICATION },
        select: { id: true, verificationStatus: true, user: { select: { name: true, phone: true } } },
      }),
    ]);

    // Documents KYC rattachés (polymorphe refTable/refId).
    const docs = await prisma.media.findMany({
      where: {
        OR: [
          { refTable: 'partner_profiles', refId: { in: partners.map((p) => p.id) } },
          { refTable: 'doctor_profiles',  refId: { in: doctors.map((d) => d.id) } },
          { refTable: 'couriers',         refId: { in: couriers.map((c) => c.id) } },
        ],
      },
      select: { id: true, url: true, kind: true, refTable: true, refId: true },
    });
    const docsFor = (table: string, id: string) => docs.filter((m) => m.refTable === table && m.refId === id);

    return {
      partners: partners.map((p) => ({ type: 'partner' as const, id: p.id, name: p.legalName, phone: p.phone, documents: docsFor('partner_profiles', p.id) })),
      doctors:  doctors.map((d) => ({ type: 'doctor' as const, id: d.id, name: d.user?.name ?? '—', phone: d.user?.phone ?? null, documents: docsFor('doctor_profiles', d.id) })),
      couriers: couriers.map((c) => ({ type: 'courier' as const, id: c.id, name: c.user?.name ?? '—', phone: c.user?.phone ?? null, documents: docsFor('couriers', c.id) })),
    };
  }

  /**
   * Pré-contrôle IA (MBOLO Assist — moteur vision) du justificatif : lisibilité +
   * points d'attention. L'IA n'approuve rien — c'est une aide au valideur humain.
   */
  async screen(type: KycType, id: string) {
    const media = await prisma.media.findFirst({
      where: { refTable: TABLE[type], refId: id, kind: DOC_KIND[type] },
      orderBy: { createdAt: 'desc' },
    });
    if (!media) throw HTTP.notFound('Aucun justificatif déposé');
    if (media.mimeType === 'application/pdf' || !this.ai) {
      return { legible: true, concerns: ['Pré-contrôle IA non applicable — vérification manuelle requise'] };
    }
    const safe = path.basename(media.url);
    let base64: string;
    try {
      base64 = await fs.readFile(path.join(process.cwd(), 'uploads', safe), { encoding: 'base64' });
    } catch {
      throw HTTP.unprocessable('Fichier justificatif introuvable sur le serveur');
    }
    return this.ai.screenDocument({ imageBase64: base64, mediaType: media.mimeType, docType: type });
  }

  /** Décision humaine finale : vérifié ou rejeté. */
  async decide(type: KycType, id: string, status: 'verified' | 'rejected') {
    const value = status === 'verified' ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED;
    if (type === 'partner') return prisma.partnerProfile.update({ where: { id }, data: { verificationStatus: value } });
    if (type === 'doctor')  return prisma.doctorProfile.update({ where: { id }, data: { verificationStatus: value } });
    return prisma.courier.update({ where: { id }, data: { verificationStatus: value } });
  }
}
