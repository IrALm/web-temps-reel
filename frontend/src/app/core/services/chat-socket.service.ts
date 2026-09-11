import {isPlatformBrowser} from '@angular/common';
import {Injectable, PLATFORM_ID, inject, signal} from '@angular/core';
import {io, type Socket} from 'socket.io-client';
import {chatMessageCreatedEventSchema} from '@resto/shared';
import {socketIoUrl} from '../config';
import {AuthService} from './auth.service';
import {ChatApiService, type ChatMessageWithId} from './chat-api.service';
import {NetworkMonitorService} from './network-monitor.service';

/**
 * Chat d'équipe — toujours sur Socket.IO, indépendamment du mode choisi
 * pour le tableau de commandes (le sélecteur de mode ne concerne que la
 * réception des mises à jour de commandes, voir RealtimeOrdersService).
 */
@Injectable({providedIn: 'root'})
export class ChatSocketService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);
  private readonly chatApi = inject(ChatApiService);
  private readonly monitor = inject(NetworkMonitorService);

  readonly messages = signal<ChatMessageWithId[]>([]);
  readonly connected = signal(false);

  private socket: Socket | null = null;
  private currentChannel: string | null = null;
  private nextLocalId = 1;

  connect(): void {
    if (this.socket || !isPlatformBrowser(this.platformId)) {
      return;
    }
    const userId = this.authService.user()?.id;
    if (!userId) {
      return;
    }

    const socket = io(socketIoUrl(), {auth: {userId}});
    this.socket = socket;

    socket.on('connect', () => {
      this.connected.set(true);
      this.monitor.record({
        strategy: 'chat',
        kind: 'lifecycle',
        label: 'chat connecté',
        latencyMs: null,
        status: 'open',
      });
    });
    socket.on('disconnect', () => {
      this.connected.set(false);
      this.monitor.record({
        strategy: 'chat',
        kind: 'lifecycle',
        label: 'chat déconnecté',
        latencyMs: null,
        status: 'closed',
      });
    });
    socket.on('chat:message:created', (raw: unknown) => {
      const parsed = chatMessageCreatedEventSchema.safeParse(raw);
      if (!parsed.success || parsed.data.channelId !== this.currentChannel) {
        return;
      }
      const latencyMs = Math.max(0, Date.now() - parsed.data.createdAt.getTime());
      this.monitor.record({
        strategy: 'chat',
        kind: 'event',
        label: 'chat:message:created',
        latencyMs,
        status: 'push',
      });
      this.messages.update((list) => [
        ...list,
        {
          id: parsed.data.messageId,
          channelId: parsed.data.channelId,
          authorId: parsed.data.authorId,
          content: parsed.data.content,
          createdAt: parsed.data.createdAt,
        },
      ]);
    });
  }

  async joinChannel(channelId: string): Promise<void> {
    this.connect();
    this.currentChannel = channelId;
    this.messages.set(await this.chatApi.history(channelId));
    this.socket?.emit('chat:channel:join', {channelId});
  }

  send(content: string): void {
    if (!this.socket || !this.currentChannel || !content.trim()) {
      return;
    }
    this.socket.emit('chat:message:create', {
      type: 'chat:message:create',
      clientMessageId: `local-${this.nextLocalId++}`,
      channelId: this.currentChannel,
      content,
    });
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
    this.currentChannel = null;
    this.connected.set(false);
  }
}
