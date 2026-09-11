import {Module} from '@nestjs/common';
import {EventLogModule} from '../events/event-log.module.js';
import {ChatWsGateway} from './chat-ws.gateway.js';
import {ChatController} from './chat.controller.js';
import {ChatService} from './chat.service.js';

@Module({
  imports: [EventLogModule],
  controllers: [ChatController],
  providers: [ChatService, ChatWsGateway],
  exports: [ChatService],
})
export class ChatModule {}
