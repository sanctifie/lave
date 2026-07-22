import { z } from 'zod';
import { PrescriptionType, SubstitutionConsent } from '@mbolo/shared';

export const CreatePrescriptionSchema = z.object({
  type: z.nativeEnum(PrescriptionType).default(PrescriptionType.DRUG),
  targetPartnerId: z.string().cuid('ID pharmacie invalide'),
  // Consentement du patient à un équivalent si le produit exact manque.
  substitutionConsent: z.nativeEnum(SubstitutionConsent).default(SubstitutionConsent.ASK),
  // Conseil au comptoir : description des symptômes (pas de scan requis).
  notes: z.string().max(1000).optional(),
});

export const ValidatePrescriptionSchema = z
  .object({
    approved: z.boolean(),
    items: z
      .array(
        z.object({
          name: z.string().min(1),
          quantity: z.number().int().positive(),
          unitPriceFcfa: z.number().int().positive(),
          // Substitution : cet article dispensé remplace-t-il un produit prescrit ?
          substituted: z.boolean().optional(),
          originalName: z.string().min(1).optional(), // produit d'origine (si substitué)
          substitutionReason: z.string().min(1).optional(),
          // Stupéfiant : article à inscrire à l'ordonnancier légal
          controlled: z.boolean().optional(),
          // Sensible : antibiotique / dangereux / détournable → collecte de
          // l'original + cachet (sans ordonnancier).
          sensitive: z.boolean().optional(),
          // Tiers-payant : article inscrit sur la liste CNAMGS des remboursables.
          // Seuls ces articles ouvrent droit à la part caisse (ignoré si le
          // patient n'est pas assuré).
          reimbursable: z.boolean().optional(),
        }),
      )
      .optional(),
    // Conseil officinal (cross-sell) : produits conseil / OTC proposés en
    // complément. Jamais des médicaments de substitution ; le patient reste
    // libre de les ajouter (facultatif).
    recommendations: z
      .array(
        z.object({
          name: z.string().min(1),
          quantity: z.number().int().positive(),
          unitPriceFcfa: z.number().int().positive(),
          note: z.string().min(1).optional(),
        }),
      )
      .optional(),
    // Médecin prescripteur (mention obligatoire de l'ordonnancier si stupéfiant)
    prescriberName: z.string().min(2).optional(),
    rejectionReason: z.string().min(5).optional(),
  })
  .refine(
    (d) => {
      // Stupéfiant → le nom du médecin prescripteur est obligatoire (ordonnancier).
      const hasControlled = d.items?.some((i) => i.controlled);
      return !hasControlled || !!d.prescriberName;
    },
    { message: 'prescriberName requis si un article est un stupéfiant (ordonnancier)' },
  )
  .refine(
    (d) => {
      if (d.approved) return d.items && d.items.length > 0;
      return !!d.rejectionReason;
    },
    { message: 'items requis si approuvé — rejectionReason requis si refusé' },
  );

export const IssuePrescriptionSchema = z.object({
  consultationId: z.string().cuid(),
  items: z
    .array(z.object({ name: z.string(), dosage: z.string().optional(), quantity: z.number().int().positive() }))
    .min(1),
});

export type CreatePrescriptionInput = z.infer<typeof CreatePrescriptionSchema>;
export type ValidatePrescriptionInput = z.infer<typeof ValidatePrescriptionSchema>;
export type IssuePrescriptionInput = z.infer<typeof IssuePrescriptionSchema>;
