/**
 * Génère src/generated/tokens.css à partir des design tokens partagés
 * (packages/shared/src/tokens/tokens.json — source unique de vérité).
 *
 * Lancé automatiquement avant `dev` et `build` (predev/prebuild). Le fichier
 * généré est committé pour que le build reste reproductible même sans le hook.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const tokensPath = join(here, '../../../packages/shared/src/tokens/tokens.json');
const outPath = join(here, '../src/generated/tokens.css');

const { light, dark } = JSON.parse(readFileSync(tokensPath, 'utf8'));

const block = (vars, indent = '  ') =>
  Object.entries(vars)
    .map(([k, v]) => `${indent}--${k}: ${v};`)
    .join('\n');

const css = `/* ⚠️ FICHIER GÉNÉRÉ — ne pas éditer à la main.
 * Source : packages/shared/src/tokens/tokens.json
 * Régénérer : node scripts/gen-tokens.mjs (lancé auto en predev/prebuild)
 */

:root {
  color-scheme: light;
${block(light)}
}

:root[data-theme='dark'] {
  color-scheme: dark;
${block(dark)}
}

/* Préférence système tant que l'utilisateur n'a pas choisi explicitement. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    color-scheme: dark;
${block(dark, '    ')}
  }
}
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, css);
console.log(`[gen-tokens] ${outPath} généré (${Object.keys(light).length} tokens × 2 thèmes)`);
