import {Injectable, Logger, type OnModuleInit} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {WebSocket, WebSocketServer} from 'ws';
import {PrismaService} from '../prisma/prisma.service.js';
import {WsUpgradeRouter} from '../realtime/ws-upgrade.router.js';

const WS_PATH = '/ws/orders';
const ORDER_EVENT_TYPES = ['order_created', 'order_status_updated'] as const;

/**
 * WebSocket natif pour le tableau de commandes — pendant de
 * `ChatWsGateway`, mais pour les événements de commande plutôt que le chat.
 * Sert de 4ᵉ mécanisme comparable au sélecteur de mode côté frontend (avec
 * polling, long polling, SSE et Socket.IO).
 *
 * Lecture seule : les mutations (créer une commande, changer son statut)
 * continuent de passer par les endpoints REST, quel que soit le mécanisme
 * de réception choisi — seule la manière de RECEVOIR les mises à jour
 * change d'un mode à l'autre.
 */
@Injectable()
export class OrderWsGateway implements OnModuleInit {
  private readonly logger = new Logger(OrderWsGateway.name);
  private readonly clients = new Set<WebSocket>();

  constructor(
    private readonly wsUpgradeRouter: WsUpgradeRouter,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    const wss = new WebSocketServer({noServer: true});
    this.wsUpgradeRouter.register(WS_PATH, wss);

    wss.on('connection', async (socket: WebSocket, request) => {
      this.clients.add(socket);
      socket.on('close', () => this.clients.delete(socket));

      const after = Number(
        new URL(request.url ?? '', 'http://localhost').searchParams.get('after') ?? 0,
      );

      const missed = await this.prisma.event.findMany({
        where: {
          id: {gt: Number.isFinite(after) ? after : 0},
          type: {in: [...ORDER_EVENT_TYPES]},
        },
        orderBy: {id: 'asc'},
      });

      for (const event of missed) {
        this.send(socket, this.toMessage(event.type, event.id, event.payload, event.createdAt));
      }
    });

    for (const type of ORDER_EVENT_TYPES) {
      this.eventEmitter.on(type, (envelope: any) => {
        this.broadcast(this.toMessage(type, envelope.eventId, envelope, envelope.createdAt));
      });
    }
  }

  private toMessage(type: string, eventId: number, payload: unknown, createdAt: Date) {
    return {
      type: type === 'order_created' ? 'order:created' : 'order:status-updated',
      eventId,
      createdAt,
      ...(payload as Record<string, unknown>),
    };
  }

  private send(socket: WebSocket, data: unknown) {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(data));
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
