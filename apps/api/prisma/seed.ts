import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Spécialités médicales de départ (idempotent via name @unique). */
const SPECIALTIES = [
  'Médecine générale',
  'Pédiatrie',
  'Cardiologie',
  'Gynécologie',
  'Dermatologie',
  'Ophtalmologie',
  'Médecine interne',
  'Nutrition',
];

/**
 * Tarification de départ.
 * ⚠️ platform_commission_pct est un POURCENTAGE ENTIER (15 = 15 %) : tout le
 * code lit `Number(valueNum ?? 15)` puis calcule `1 - pct / 100`. Une valeur
 * 0.15 donnerait une commission réelle de 0,15 %.
 */
const PRICING = [
  { kind: 'delivery_base',                 valueFcfa: 1000, valueNum: null },
  { kind: 'delivery_per_km',               valueFcfa: 200,  valueNum: null },
  { kind: 'service_fee',                   valueFcfa: 500,  valueNum: null },
  { kind: 'consultation_base_fee',         valueFcfa: 5000, valueNum: null },
  { kind: 'meal_delivery_fee',             valueFcfa: 500,  valueNum: null },
  { kind: 'ride_base_fee',                 valueFcfa: 1500, valueNum: null },
  { kind: 'ride_per_km',                   valueFcfa: 200,  valueNum: null },
  { kind: 'video_usd_per_participant_min', valueFcfa: null, valueNum: 0.00099 },
  { kind: 'usd_to_fcfa_rate',              valueFcfa: null, valueNum: 600 },
  { kind: 'platform_commission_pct',       valueFcfa: null, valueNum: 15 },
] as const;

async function main() {
  for (const name of SPECIALTIES) {
    await prisma.doctorSpecialty.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.warn(`[seed] ${SPECIALTIES.length} spécialités médicales`);

  // update: {} → on ne crée que si absent, sans écraser les valeurs déjà
  // ajustées par un admin via le dashboard.
  for (const entry of PRICING) {
    await prisma.pricing.upsert({
      where:  { kind: entry.kind as never },
      update: {},
      create: {
        kind:      entry.kind as never,
        valueFcfa: entry.valueFcfa,
        valueNum:  entry.valueNum,
        updatedBy: 'seed',
      },
    });
  }
  console.warn(`[seed] ${PRICING.length} paramètres de tarification`);
}

main()
  .then(() => console.warn('[seed] Terminé.'))
  .catch((e) => {
    console.error('[seed] Échec :', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
