import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module.js';
import {ChatModule} from '../chat/chat.module.js';
import {OrderModule} from '../order/order.module.js';
import {RealtimeGateway} from './realtime.gateway.js';

@Module({
  imports: [AuthModule, OrderModule, ChatModule],
  providers: [RealtimeGateway],
})
export class RealtimeModule {}
