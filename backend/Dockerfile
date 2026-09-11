FROM node:22-bookworm-slim

WORKDIR /app

# Requis par le moteur Prisma pour détecter correctement la version
# d'OpenSSL disponible (sinon avertissement au build et risque de plantage
# au runtime si le mauvais binaire de moteur est récupéré).
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY backend/scripts ./backend/scripts
COPY shared/package*.json ./shared/

RUN npm ci

COPY backend ./backend
COPY shared ./shared

RUN npm run build --workspace=shared
RUN npx prisma generate --schema=backend/prisma/schema.prisma

RUN npm run build --workspace=backend

EXPOSE 3000

# Applique les migrations (idempotent — ne fait rien si déjà à jour) et le
# seed (idempotent via upsert) avant de démarrer : indispensable pour qu'un
# volume Postgres tout neuf (premier `docker compose up`) fonctionne sans
# étape manuelle.
CMD ["sh", "-c", "cd backend && npx prisma migrate deploy && node prisma/seed.js && node dist/main"]