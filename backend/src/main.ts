import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  // Dev uniquement : le frontend Angular tourne sur un port différent
  // (4200) — REST/SSE passent par le fetch du navigateur et sont donc
  // soumis à CORS (Socket.IO et le WebSocket natif ont leur propre gestion,
  // configurée séparément).
  app.enableCors({origin: true, credentials: true});
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
