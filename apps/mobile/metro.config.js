// Configuration Metro pour un monorepo pnpm (Expo SDK 51).
// Sans cela, le bundling release échoue : « Unable to resolve module @mbolo/shared »
// car Metro ne regarde que apps/mobile/node_modules et ignore les packages
// workspace liés depuis la racine.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Surveiller toute la racine du monorepo (pour lire packages/shared + node_modules racine).
config.watchFolders = [monorepoRoot];

// 2. Résoudre les modules d'abord dans l'app, puis à la racine (node-linker=hoisted).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Empêcher la remontée hiérarchique implicite (déterminisme en monorepo).
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
