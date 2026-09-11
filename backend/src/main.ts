import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  // Dev uniquement : le frontend Angular tourne sur un port différent
  // (4200) — REST/SSE passent par le fetch du navigateur et sont donc
  // soumis à CORS (Socket.IO et le WebSocket natif ont leur propre gestion,
  // configurée séparément). En prod, tout passe par le même reverse proxy
  // nginx (même origine), donc ceci ne sert plus mais reste inoffensif.
  app.enableCors({origin: true, credentials: true});
  // Toutes les routes REST (dont le SSE, qui est une route @Controller
  // normale côté Nest) passent sous /api — nécessaire pour les distinguer
  // des routes Angular sur la même origine derrière le reverse proxy
  // (ex. /orders = route Angular, /api/orders = endpoint REST).
  // Ne concerne pas /ws/* (WsUpgradeRouter) ni /socket.io/ (Socket.IO),
  // gérés en dehors du routeur HTTP de Nest.
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
