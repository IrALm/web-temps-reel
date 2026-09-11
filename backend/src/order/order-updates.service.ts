import {Injectable} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {PrismaService} from '../prisma/prisma.service.js';

const ORDER_EVENT_TYPES = ['order_created', 'order_status_updated'] as const;
const DEFAULT_TIMEOUT_MS = 25_000;

type EventEnvelope = Record<string, unknown> & {eventId: number; createdAt: Date};

/**
 * Implémente le long polling pour `GET /orders/updates?after=<eventId>` :
 * - s'il existe déjà des événements plus récents que `after` en base (le
 *   client a raté quelque chose entre deux appels, ou vient de se
 *   reconnecter), on les renvoie immédiatement (rattrapage) ;
 * - sinon, on attend qu'un nouvel événement arrive sur le bus interne, avec
 *   un délai maximal — passé ce délai, on répond avec une liste vide et le
 *   client relance aussitôt un nouvel appel (c'est le principe du long
 *   polling : la requête HTTP reste ouverte tant qu'il n'y a rien à dire).
 */
@Injectable()
export class OrderUpdatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async waitForUpdates(
    after: number,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  ): Promise<EventEnvelope[]> {
    const missed = await this.prisma.event.findMany({
      where: {
        id: {gt: after},
        type: {in: [...ORDER_EVENT_TYPES]},
      },
      orderBy: {id: 'asc'},
    });

    if (missed.length > 0) {
      return missed.map((event) => this.toEnvelope(event));
    }

    return new Promise<EventEnvelope[]>((resolve) => {
      const onEvent = (envelope: EventEnvelope) => {
        cleanup();
        resolve([envelope]);
      };

      const timer = setTimeout(() => {
        cleanup();
        resolve([]);
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timer);
        for (const type of ORDER_EVENT_TYPES) {
          this.eventEmitter.off(type, onEvent);
        }
      };

      for (const type of ORDER_EVENT_TYPES) {
        this.eventEmitter.on(type, onEvent);
      }
    });
  }

  private toEnvelope(event: {
    id: number;
    payload: unknown;
    createdAt: Date;
  }): EventEnvelope {
    return {
      ...(event.payload as Record<string, unknown>),
      eventId: event.id,
      createdAt: event.createdAt,
    };
  }
}
