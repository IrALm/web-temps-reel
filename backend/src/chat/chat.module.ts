import {Module} from '@nestjs/common';
import {EventLogModule} from '../events/event-log.module.js';
import {ChatService} from './chat.service.js';

@Module({
  imports: [EventLogModule],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
