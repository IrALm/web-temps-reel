# =========================
# 1. Build Angular
# =========================
FROM node:22-alpine AS build

WORKDIR /app

# Workspace racine
COPY package*.json ./

# Packages des workspaces
COPY frontend/package*.json ./frontend/
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/

# Installation unique des dépendances
RUN npm ci 

# Code source
COPY frontend ./frontend
COPY shared ./shared

# Build Angular
RUN npm run build --workspace=frontend


# =========================
# 2. Serveur Nginx
# =========================
FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/frontend/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]