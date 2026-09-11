import {Controller, Get, Param} from '@nestjs/common';
import {ChatService} from './chat.service.js';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /** Historique d'un canal, chargé une fois à l'ouverture (le WS ne pousse que les nouveaux messages). */
  @Get(':channelId/messages')
  listMessages(@Param('channelId') channelId: string) {
    return this.chatService.listByChannel(channelId);
  }
}
