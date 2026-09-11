import {Injectable, type MessageEvent} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {
  concat,
  defer,
  from as rxFrom,
  fromEvent,
  interval,
  merge,
  Observable,
} from 'rxjs';
import {concatMap, map} from 'rxjs/operators';
import {PrismaService} from '../prisma/prisma.service.js';

const ORDER_EVENT_TYPES = ['order_created', 'order_status_updated'] as const;

/** Noms d'événements SSE tels qu'attendus côté client (`EventSource`). */
const SSE_EVENT_NAMES: Record<(typeof ORDER_EVENT_TYPES)[number], string> = {
  order_created: 'order:created',
  order_status_updated: 'order:status-updated',
};

const HEARTBEAT_INTERVAL_MS = 20_000;

/**
 * Construit le flux SSE de `GET /orders/stream` :
 * - rattrapage : rejoue d'abord tous les événements plus récents que
 *   `lastEventId` (repris du header `Last-Event-ID` envoyé automatiquement
 *   par `EventSource` à la reconnexion, ou du paramètre `after`) ;
 * - puis reste ouvert et pousse chaque nouvel événement dès qu'il arrive sur
 *   le bus interne ;
 * - un battement de cœur périodique (sans `id`) évite qu'un proxy ferme la
 *   connexion pour inactivité.
 */
@Injectable()
export class OrderSseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  streamSince(lastEventId: number): Observable<MessageEvent> {
    const catchUp$ = defer(() =>
      this.prisma.event.findMany({
        where: {
          id: {gt: lastEventId},
          type: {in: [...ORDER_EVENT_TYPES]},
        },
        orderBy: {id: 'asc'},
      }),
    ).pipe(
      concatMap((events) =>
        rxFrom(
          events.map((event) =>
            this.toMessageEvent(
              event.type as (typeof ORDER_EVENT_TYPES)[number],
              event.id,
              event.payload,
              event.createdAt,
            ),
          ),
        ),
      ),
    );

    const live$ = merge(
      ...ORDER_EVENT_TYPES.map((type) =>
        fromEvent(this.eventEmitter, type).pipe(
          map((envelope: any) =>
            this.toMessageEvent(type, envelope.eventId, envelope, envelope.createdAt),
          ),
        ),
      ),
    );

    const heartbeat$ = interval(HEARTBEAT_INTERVAL_MS).pipe(
      map(() => ({type: 'heartbeat', data: {ts: new Date().toISOString()}}) as MessageEvent),
    );

    return merge(concat(catchUp$, live$), heartbeat$);
  }

  private toMessageEvent(
    type: (typeof ORDER_EVENT_TYPES)[number],
    eventId: number,
    payload: unknown,
    createdAt: Date,
  ): MessageEvent {
    return {
      id: String(eventId),
      type: SSE_EVENT_NAMES[type],
      data: {...(payload as Record<string, unknown>), eventId, createdAt},
    };
  }
}
