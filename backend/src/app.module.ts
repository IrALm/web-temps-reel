import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { EventLogModule } from './events/event-log.module.js';
import { OrderModule } from './order/order.module.js';
import { ChatModule } from './chat/chat.module.js';
import { AuthModule } from './auth/auth.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { WsUpgradeModule } from './realtime/ws-upgrade.module.js';
import { MenuModule } from './menu/menu.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'backend',
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    WsUpgradeModule,
    EventLogModule,
    OrderModule,
    ChatModule,
    AuthModule,
    RealtimeModule,
    MenuModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
