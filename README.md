# MBOLO Santé — Plateforme de logistique de soins

Monorepo Turborepo — Node.js / Express / TypeScript / Prisma / PostgreSQL / React Native / Expo.

## Structure

```
apps/
  api/      — API REST (Express + TypeScript + Prisma)
  mobile/   — Application mobile (React Native + Expo)
packages/
  shared/   — Types, enums et schémas Zod partagés
  config/   — ESLint, Prettier, TypeScript partagés
```

## Prérequis

- Node.js 20+
- pnpm 9+
- Docker (pour PostgreSQL + Redis en local)

## Démarrage rapide

```bash
# 1. Dépendances
pnpm install

# 2. Infra locale
docker-compose up -d

# 3. Variables d'environnement
cp apps/api/.env.example apps/api/.env

# 4. Migrations DB
pnpm db:migrate

# 5. Lancer l'API
pnpm dev --filter api
```

## Contrainte légale fondamentale

La plateforme n'est **jamais** le vendeur du médicament. Le pharmacien reste le dispensateur légal ;
le livreur est mandaté par l'officine. Un statut `pharmacist_validation` est obligatoire avant toute
préparation ou livraison. Aucune marge n'est prélevée sur le produit — le revenu provient uniquement
des frais de service et de livraison.
