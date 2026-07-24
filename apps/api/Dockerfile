# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Image de production de l'API MBOLO Santé (monorepo pnpm + Prisma).
# Build depuis la RACINE du dépôt :  docker build -f apps/api/Dockerfile -t mbolo-api .
# ─────────────────────────────────────────────────────────────────────────────

# ─── Étape 1 : dépendances + build ───────────────────────────────────────────
FROM node:20-bookworm-slim AS build
WORKDIR /repo

# pnpm via corepack (version alignée sur "packageManager" du package.json racine).
RUN corepack enable

# Manifs d'abord (cache Docker optimal : on ne réinstalle que si un manifest change).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json        apps/api/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Code source puis build : shared → client Prisma → API.
COPY packages/shared packages/shared
COPY apps/api        apps/api
RUN pnpm --filter @mbolo/shared build \
 && pnpm --filter api exec prisma generate \
 && pnpm --filter api build

# node_modules de production uniquement (allège l'image finale).
RUN pnpm --filter api --prod deploy /out

# ─── Étape 2 : runtime minimal ───────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# openssl est requis par le moteur Prisma.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /app/uploads && chown -R node:node /app

# Artefacts de build + dépendances de production + schéma/moteur Prisma.
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/apps/api/dist ./dist
COPY --from=build --chown=node:node /repo/apps/api/prisma ./prisma

USER node
EXPOSE 3000

# Vérifie la readiness (dépendances up) plutôt que la simple liveness.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
