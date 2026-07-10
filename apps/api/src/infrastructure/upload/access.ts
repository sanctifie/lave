import path from 'path';
import { prisma } from '../prisma/client';
import { UserRole, PrescriptionSource } from '@mbolo/shared';

export interface MediaRequester {
  userId: string;
  role: UserRole;
  /** Officine de rattachement (uniquement pour PARTNER_STAFF). */
  partnerProfileId?: string | null;
}

export interface MediaRecord {
  uploadedById: string;
  refTable: string | null;
  refId: string | null;
}

export interface PrescriptionRef {
  patientId: string;
  issuedById: string | null;
  targetPartnerId: string | null;
  source: string;
}

/**
 * Décision d'accès pure (sans I/O) — testable exhaustivement.
 *
 * Règle : un fichier média n'est visible que par les personnes légitimement
 * impliquées dans la ressource qu'il documente.
 *   • ADMIN : accès total (supervision).
 *   • L'uploadeur (le patient qui a envoyé le scan) : toujours.
 *   • Ordonnances : le patient concerné, le médecin émetteur, et le pharmacien
 *     de l'officine cible (ou de toute officine si téléconsultation).
 */
export function decideMediaAccess(params: {
  requester: MediaRequester;
  media: MediaRecord;
  prescription?: PrescriptionRef | null;
}): boolean {
  const { requester, media, prescription } = params;

  if (requester.role === UserRole.ADMIN) return true;
  if (media.uploadedById === requester.userId) return true;

  if (media.refTable === 'prescriptions') {
    if (!prescription) return false;
    if (prescription.patientId === requester.userId) return true;
    if (prescription.issuedById && prescription.issuedById === requester.userId) return true;

    if (requester.role === UserRole.PARTNER_STAFF && requester.partnerProfileId) {
      if (prescription.targetPartnerId === requester.partnerProfileId) return true;
      if (
        prescription.targetPartnerId === null &&
        prescription.source === PrescriptionSource.TELECONSULTATION
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Autorise le téléchargement d'un fichier `/uploads/<filename>`.
 * Retourne `false` si le fichier n'est pas tracé en base (on ne sert jamais un
 * fichier orphelin) ou si le demandeur n'est pas légitime pour cette ressource.
 */
export async function canAccessMediaFile(
  filename: string,
  requester: Pick<MediaRequester, 'userId' | 'role'>,
): Promise<boolean> {
  const safeName = path.basename(filename); // neutralise toute traversée (../)
  if (!safeName) return false;

  const media = await prisma.media.findFirst({
    where: { url: `/uploads/${safeName}` },
    select: { uploadedById: true, refTable: true, refId: true },
  });
  if (!media) return false;

  let prescription: PrescriptionRef | null = null;
  if (media.refTable === 'prescriptions' && media.refId) {
    prescription = await prisma.prescription.findUnique({
      where: { id: media.refId },
      select: { patientId: true, issuedById: true, targetPartnerId: true, source: true },
    });
  }

  let partnerProfileId: string | null = null;
  if (requester.role === UserRole.PARTNER_STAFF) {
    const user = await prisma.user.findUnique({
      where: { id: requester.userId },
      select: { partnerProfileId: true },
    });
    partnerProfileId = user?.partnerProfileId ?? null;
  }

  return decideMediaAccess({
    requester: { ...requester, partnerProfileId },
    media,
    prescription,
  });
}
