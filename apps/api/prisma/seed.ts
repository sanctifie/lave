import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const pricingEntries = [
    { kind: 'delivery_base',                valueFcfa: 1000,   valueNum: null },
    { kind: 'delivery_per_km',              valueFcfa: 200,    valueNum: null },
    { kind: 'service_fee',                  valueFcfa: 500,    valueNum: null },
    { kind: 'consultation_base_fee',        valueFcfa: 2000,   valueNum: null },
    { kind: 'video_usd_per_participant_min',valueFcfa: null,   valueNum: 0.00099 },
    { kind: 'usd_to_fcfa_rate',             valueFcfa: null,   valueNum: 600 },
    { kind: 'platform_commission_pct',      valueFcfa: null,   valueNum: 0.15 },
    { kind: 'meal_delivery_fee',            valueFcfa: 800,    valueNum: null },
    { kind: 'ride_base_fee',                valueFcfa: 2000,   valueNum: null },
    { kind: 'ride_per_km',                  valueFcfa: 300,    valueNum: null },
  ] as const;

  for (const entry of pricingEntries) {
    await prisma.pricing.upsert({
      where: { kind: entry.kind as Parameters<typeof prisma.pricing.upsert>[0]['where']['kind'] },
      update: { valueFcfa: entry.valueFcfa, valueNum: entry.valueNum },
      create: { kind: entry.kind as Parameters<typeof prisma.pricing.create>[0]['data']['kind'], valueFcfa: entry.valueFcfa, valueNum: entry.valueNum },
    });
  }

  console.warn('[seed] Table pricing initialisée');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
