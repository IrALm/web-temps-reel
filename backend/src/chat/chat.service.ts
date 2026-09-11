import {Injectable} from '@nestjs/common';
import type {ChatMessage} from '@resto/shared';
import {EventLogService} from '../events/event-log.service.js';
import {PrismaService} from '../prisma/prisma.service.js';

export type PostMessageInput = Omit<ChatMessage, 'createdAt'>;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventLog: EventLogService,
  ) {}

  listByChannel(channelId: string) {
    return this.prisma.chatMessage.findMany({
      where: {channelId},
      orderBy: {createdAt: 'asc'},
    });
  }

  async postMessage(input: PostMessageInput) {
    const message = await this.prisma.chatMessage.create({
      data: {
        channelId: input.channelId,
        authorId: input.authorId,
        content: input.content,
      },
    });

    await this.eventLog.publish('chat_message_created', {
      messageId: message.id,
      channelId: message.channelId,
      authorId: message.authorId,
      content: message.content,
    });

    return message;
  }
}
