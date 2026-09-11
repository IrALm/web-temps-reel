# =========================
# 1. Build Angular
# =========================
FROM node:22-bookworm-slim AS build

WORKDIR /app

# Workspace racine
COPY package*.json ./

# Packages des workspaces
COPY frontend/package*.json ./frontend/
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/
# npm ci installe TOUS les workspaces du monorepo (racine), donc déclenche
# aussi le postinstall de backend/ — son script doit déjà être présent.
COPY backend/scripts ./backend/scripts

# Installation unique des dépendances
RUN npm ci

# Code source
COPY frontend ./frontend
COPY shared ./shared

# @resto/shared doit être compilé (dist/) avant que le frontend ne l'importe
RUN npm run build --workspace=shared

# Build Angular
RUN npm run build --workspace=frontend


# =========================
# 2. Serveur Nginx
# =========================
FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/frontend/dist/frontend/browser /usr/share/nginx/html
# Le build Angular (SSR activé dans angular.json) émet index.csr.html plutôt
# qu'un index.html classique ; nginx a besoin de ce dernier comme document
# par défaut.
RUN mv /usr/share/nginx/html/index.csr.html /usr/share/nginx/html/index.html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]