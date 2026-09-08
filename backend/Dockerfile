FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

RUN npm ci

COPY backend ./backend
COPY shared ./shared

RUN npm run build --workspace=backend

EXPOSE 3000

CMD ["npm", "run", "start:prod", "--workspace=backend"]