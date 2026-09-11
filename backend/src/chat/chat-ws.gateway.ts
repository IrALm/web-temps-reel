import {Injectable, Logger, type OnModuleInit} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {chatMessageCreateCommandSchema} from '@resto/shared';
import {WebSocket, WebSocketServer} from 'ws';
import {WsUpgradeRouter} from '../realtime/ws-upgrade.router.js';
import {ChatService} from './chat.service.js';

const WS_PATH = '/ws/chat';
const CREATED_EVENT_TYPE = 'chat:message:created';

/**
 * Chat en WebSocket natif (paquet `ws`, sans Socket.IO) — branché
 * directement sur le serveur HTTP existant de Nest.
 *
 * Volontairement simple pour cette étape :
 * - l'identité de l'auteur vient du paramètre `authorId` de l'URL de
 *   connexion (`?authorId=...`), jamais du contenu du message envoyé par le
 *   client ensuite — un vrai mécanisme de session/authentification
 *   remplacera ce paramètre à l'étape Socket.IO ;
 * - la diffusion ne réagit pas directement à l'écriture WS elle-même mais à
 *   l'événement `chat:message:created` publié par `EventLogService` : ainsi
 *   un message créé par un autre transport (REST, plus tard Socket.IO) est
 *   lui aussi diffusé à tous les clients WS connectés.
 */
@Injectable()
export class ChatWsGateway implements OnModuleInit {
  private readonly logger = new Logger(ChatWsGateway.name);
  private readonly clients = new Set<WebSocket>();

  constructor(
    private readonly wsUpgradeRouter: WsUpgradeRouter,
    private readonly chatService: ChatService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    const wss = new WebSocketServer({noServer: true});
    this.wsUpgradeRouter.register(WS_PATH, wss);

    wss.on('connection', (socket: WebSocket, request) => {
      this.clients.add(socket);
      this.logger.log(`Client WS connecté (${this.clients.size} au total)`);

      socket.on('close', () => {
        this.clients.delete(socket);
      });

      socket.on('message', (raw: Buffer) => {
        void this.handleMessage(socket, request.url, raw);
      });
    });

    this.eventEmitter.on('chat_message_created', (envelope: any) => {
      this.broadcast({
        type: CREATED_EVENT_TYPE,
        eventId: envelope.eventId,
        messageId: envelope.messageId,
        channelId: envelope.channelId,
        authorId: envelope.authorId,
        content: envelope.content,
        createdAt: envelope.createdAt,
      });
    });
  }

  private async handleMessage(
    socket: WebSocket,
    requestUrl: string | undefined,
    raw: Buffer,
  ) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      this.sendAck(socket, {accepted: false, errorCode: 'invalid_json'});
      return;
    }

    const result = chatMessageCreateCommandSchema.safeParse(parsed);
    if (!result.success) {
      this.sendAck(socket, {accepted: false, errorCode: 'invalid_payload'});
      return;
    }

    const authorId = new URL(requestUrl ?? '', 'http://localhost').searchParams.get(
      'authorId',
    );
    if (!authorId) {
      this.sendAck(socket, {accepted: false, errorCode: 'unauthenticated'});
      return;
    }

    try {
      await this.chatService.postMessage({
        channelId: result.data.channelId,
        authorId,
        content: result.data.content,
      });
      this.sendAck(socket, {
        accepted: true,
        clientMessageId: result.data.clientMessageId,
      });
    } catch (error) {
      this.logger.error('Échec de création du message', error as Error);
      this.sendAck(socket, {accepted: false, errorCode: 'server_error'});
    }
  }

  private sendAck(socket: WebSocket, ack: Record<string, unknown>) {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(ack));
    }
  }

  private broadcast(data: unknown) {
    const payload = JSON.stringify(data);
    for (const client of this.clients) {
      if (client.readyState === client.OPEN) {
        client.send(payload);
      }
    }
  }
}
