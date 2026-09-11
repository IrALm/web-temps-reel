import {Injectable} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import type {EventType, Prisma} from '@prisma/client';
import {PrismaService} from '../prisma/prisma.service.js';

/**
 * Point d'entrée unique pour tous les événements métier de l'application.
 *
 * Chaque appel fait deux choses :
 * 1. persiste une ligne append-only dans la table `Event` (durable, donne à
 *    chaque événement un `eventId` stable et croissant — utilisé plus tard
 *    par le curseur `?after=` du long polling et le rattrapage SSE via
 *    `Last-Event-ID`) ;
 * 2. publie la même enveloppe sur le bus EventEmitter2 interne (utilisé pour
 *    le push immédiat aux clients connectés — SSE/WebSocket/Socket.IO).
 *
 * Les services métier (OrderService, ChatService, ...) doivent toujours
 * passer par ce service plutôt que d'écrire dans `Event` ou d'émettre
 * directement, pour que les deux restent synchronisés partout.
 */
@Injectable()
export class EventLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async publish<T extends Record<string, unknown>>(
    type: EventType,
    payload: T,
  ): Promise<T & {eventId: number; createdAt: Date}> {
    const event = await this.prisma.event.create({
      data: {type, payload: payload as Prisma.InputJsonValue},
    });

    const envelope = {
      ...payload,
      eventId: event.id,
      createdAt: event.createdAt,
    };

    this.eventEmitter.emit(type, envelope);

    return envelope;
  }
}
