import {Logger} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  chatMessageCreateCommandSchema,
  orderCreateCommandSchema,
  orderStatusUpdateCommandSchema,
  type UserRole,
} from '@resto/shared';
import type {Server, Socket} from 'socket.io';
import {AuthService} from '../auth/auth.service.js';
import {ChatService} from '../chat/chat.service.js';
import {OrderAuthorizationService} from '../order/order-authorization.service.js';
import {OrderService} from '../order/order.service.js';

type Ack = {accepted: boolean; errorCode?: string; [key: string]: unknown};

const GENERAL_CHANNEL = 'restaurant-general';
const ROOM_MAIN = 'restaurant:main';
const ROOM_KITCHEN = 'restaurant:main:kitchen';
const ROOM_SERVICE = 'restaurant:main:service';

function channelRoom(channelId: string): string {
  return `channel:${channelId}`;
}

/**
 * Gateway Socket.IO unique pour les commandes et le chat — réunit ce que les
 * séances précédentes traitaient séparément (HTTP, SSE, WebSocket natif).
 *
 * Comme pour le WebSocket natif du chat, ce gateway ne fait que déclencher
 * les services métier (OrderService/ChatService) et se contente ensuite
 * d'écouter les événements publiés par EventLogService pour diffuser aux
 * bonnes salles — jamais l'inverse. L'identité vient du handshake
 * (`socket.data.user`, résolue côté serveur), jamais du contenu d'un
 * message.
 *
 * Authentification simplifiée pour ce projet pédagogique : le client passe
 * `auth: { userId }` à la connexion Socket.IO ; le serveur vérifie que ce
 * userId existe et lit son rôle réel en base. Un vrai déploiement
 * remplacerait ça par un token signé (JWT).
 */
@WebSocketGateway({cors: {origin: '*'}})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly authService: AuthService,
    private readonly orderService: OrderService,
    private readonly chatService: ChatService,
    private readonly orderAuth: OrderAuthorizationService,
  ) {}

  async handleConnection(socket: Socket) {
    const userId = socket.handshake.auth?.['userId'];

    if (typeof userId !== 'string' || !userId) {
      socket.disconnect(true);
      return;
    }

    const user = await this.authService.findById(userId);
    if (!user) {
      socket.disconnect(true);
      return;
    }

    socket.data.user = user;
    socket.join(ROOM_MAIN);
    socket.join(channelRoom(GENERAL_CHANNEL));
    if (user.role === 'cook' || user.role === 'manager') {
      socket.join(ROOM_KITCHEN);
    }
    if (user.role === 'waiter' || user.role === 'manager') {
      socket.join(ROOM_SERVICE);
    }

    this.logger.log(`${user.name} (${user.role}) connecté — ${socket.id}`);
  }

  handleDisconnect(socket: Socket) {
    const user = socket.data.user as {name: string} | undefined;
    if (user) {
      this.logger.log(`${user.name} déconnecté — ${socket.id}`);
    }
  }

  // --- Commandes reçues des clients -------------------------------------

  @SubscribeMessage('order:create')
  async onOrderCreate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<Ack> {
    const user = this.requireUser(socket);
    if (!user || !this.orderAuth.canCreate(user.role)) {
      return {accepted: false, errorCode: 'forbidden'};
    }

    const parsed = orderCreateCommandSchema.safeParse(body);
    if (!parsed.success) {
      return {accepted: false, errorCode: 'invalid_payload'};
    }

    try {
      const order = await this.orderService.create({
        ...parsed.data,
        waiterId: user.id,
      });
      return {accepted: true, orderId: order.id, clientOrderId: parsed.data.clientOrderId};
    } catch (error) {
      this.logger.error('order:create a échoué', error as Error);
      return {accepted: false, errorCode: 'server_error'};
    }
  }

  @SubscribeMessage('order:status:update')
  async onOrderStatusUpdate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<Ack> {
    const user = this.requireUser(socket);
    const parsed = orderStatusUpdateCommandSchema.safeParse(body);

    if (!user || !parsed.success) {
      return {accepted: false, errorCode: !user ? 'forbidden' : 'invalid_payload'};
    }

    if (!this.orderAuth.canUpdateStatus(user.role, parsed.data.requestedStatus)) {
      return {accepted: false, errorCode: 'forbidden'};
    }

    try {
      await this.orderService.updateStatus(
        parsed.data.orderId,
        parsed.data.expectedStatus,
        parsed.data.requestedStatus,
      );
      return {accepted: true};
    } catch (error: any) {
      const errorCode =
        error?.status === 409
          ? 'conflict'
          : error?.status === 422
            ? 'invalid_transition'
            : error?.status === 404
              ? 'not_found'
              : 'server_error';
      return {accepted: false, errorCode};
    }
  }

  @SubscribeMessage('chat:message:create')
  async onChatMessageCreate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<Ack> {
    const user = this.requireUser(socket);
    if (!user) {
      return {accepted: false, errorCode: 'forbidden'};
    }

    const parsed = chatMessageCreateCommandSchema.safeParse(body);
    if (!parsed.success) {
      return {accepted: false, errorCode: 'invalid_payload'};
    }

    try {
      await this.chatService.postMessage({
        channelId: parsed.data.channelId,
        authorId: user.id,
        content: parsed.data.content,
      });
      return {accepted: true, clientMessageId: parsed.data.clientMessageId};
    } catch (error) {
      this.logger.error('chat:message:create a échoué', error as Error);
      return {accepted: false, errorCode: 'server_error'};
    }
  }

  @SubscribeMessage('chat:channel:join')
  onChannelJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Ack {
    const user = this.requireUser(socket);
    const channelId = (body as {channelId?: unknown})?.channelId;

    if (!user || typeof channelId !== 'string' || !channelId) {
      return {accepted: false, errorCode: !user ? 'forbidden' : 'invalid_payload'};
    }

    socket.join(channelRoom(channelId));
    return {accepted: true};
  }

  // --- Diffusion des événements métier vers les bonnes salles -----------

  @OnEvent('order_created')
  handleOrderCreated(envelope: unknown) {
    this.server.to(ROOM_MAIN).emit('order:created', envelope);
  }

  @OnEvent('order_status_updated')
  handleOrderStatusUpdated(envelope: unknown) {
    this.server.to(ROOM_MAIN).emit('order:status-updated', envelope);
  }

  @OnEvent('chat_message_created')
  handleChatMessageCreated(envelope: {channelId: string}) {
    this.server.to(channelRoom(envelope.channelId)).emit('chat:message:created', envelope);
  }

  // --- Autorisations -------------------------------------------------

  private requireUser(socket: Socket) {
    return socket.data.user as {id: string; name: string; role: UserRole} | undefined;
  }
}
