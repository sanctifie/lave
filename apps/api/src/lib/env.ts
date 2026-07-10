/**
 * Validation des variables d'environnement au démarrage (fail-fast).
 *
 * Objectif sécurité : empêcher un déploiement production de tourner avec une
 * configuration dangereuse (secret JWT par défaut/faible, webhook de paiement
 * non protégé…). En développement on se contente d'avertir pour ne pas gêner
 * l'itération locale.
 */

const DEFAULT_JWT_SECRETS = new Set([
  'change-me-in-production-min-32-chars',
  'change-me',
  'secret',
  'changeme',
]);

const MIN_JWT_SECRET_LENGTH = 32;

export interface EnvValidationResult {
  errors: string[];
  warnings: string[];
}

/** Analyse l'environnement sans quitter le process (testable). */
export function validateEnv(env: NodeJS.ProcessEnv = process.env): EnvValidationResult {
  const isProd = env.NODE_ENV === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];

  // ─── JWT_SECRET : la clé qui protège l'ensemble de l'authentification ───────
  const jwtSecret = env.JWT_SECRET;
  if (!jwtSecret) {
    errors.push('JWT_SECRET est requis (aucune valeur définie).');
  } else {
    if (DEFAULT_JWT_SECRETS.has(jwtSecret)) {
      const msg = 'JWT_SECRET utilise une valeur par défaut connue — tokens forgeables.';
      isProd ? errors.push(msg) : warnings.push(msg);
    }
    if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
      const msg = `JWT_SECRET doit faire au moins ${MIN_JWT_SECRET_LENGTH} caractères (actuel : ${jwtSecret.length}).`;
      isProd ? errors.push(msg) : warnings.push(msg);
    }
  }

  // ─── Dépendances d'infrastructure ───────────────────────────────────────────
  if (!env.DATABASE_URL) errors.push('DATABASE_URL est requis.');
  if (!env.REDIS_URL) errors.push('REDIS_URL est requis (stockage OTP + rate-limiting).');

  // ─── Webhook de paiement : ne jamais l'exposer sans secret en production ─────
  // Si MyPVIT est actif (URL_CODE défini), le webhook déclenche des versements
  // réels : il DOIT être protégé par un secret partagé.
  if (isProd && env.MYPVIT_URL_CODE && !env.MYPVIT_WEBHOOK_SECRET) {
    errors.push(
      'MYPVIT_WEBHOOK_SECRET est requis en production quand MyPVIT est actif — ' +
        'le webhook de paiement serait sinon ouvert à des confirmations forgées.',
    );
  }

  // ─── CORS : en production, ne pas laisser toutes les origines ───────────────
  if (isProd && !env.CORS_ORIGINS) {
    warnings.push('CORS_ORIGINS non défini en production — toutes les origines sont autorisées.');
  }

  return { errors, warnings };
}

/**
 * Valide et interrompt le démarrage si la configuration est dangereuse.
 * À appeler tout en haut de `main()`.
 */
export function assertEnv(env: NodeJS.ProcessEnv = process.env): void {
  const { errors, warnings } = validateEnv(env);

  for (const w of warnings) {
    console.warn(`[env] ⚠️  ${w}`);
  }

  if (errors.length > 0) {
    console.error('[env] ❌ Configuration invalide — démarrage interrompu :');
    for (const e of errors) console.error(`[env]    • ${e}`);
    throw new Error('Configuration d\'environnement invalide');
  }
}
