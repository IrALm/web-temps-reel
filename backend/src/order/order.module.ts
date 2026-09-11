import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module.js';
import {EventLogModule} from '../events/event-log.module.js';
import {OrderAuthorizationService} from './order-authorization.service.js';
import {OrderSseService} from './order-sse.service.js';
import {OrderUpdatesService} from './order-updates.service.js';
import {OrderWsGateway} from './order-ws.gateway.js';
import {OrderService} from './order.service.js';
import {OrdersController} from './orders.controller.js';

@Module({
  imports: [EventLogModule, AuthModule],
  controllers: [OrdersController],
  providers: [
    OrderService,
    OrderUpdatesService,
    OrderSseService,
    OrderWsGateway,
    OrderAuthorizationService,
  ],
  exports: [OrderService, OrderAuthorizationService],
})
export class OrderModule {}
