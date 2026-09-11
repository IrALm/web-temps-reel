import {Module} from '@nestjs/common';
import {EventLogModule} from '../events/event-log.module.js';
import {OrderService} from './order.service.js';

@Module({
  imports: [EventLogModule],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
