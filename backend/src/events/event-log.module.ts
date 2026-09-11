import {Module} from '@nestjs/common';
import {EventLogService} from './event-log.service.js';

@Module({
  providers: [EventLogService],
  exports: [EventLogService],
})
export class EventLogModule {}
