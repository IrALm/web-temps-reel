import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {CreateOrder, OrderStatus} from '@resto/shared';
import {EventLogService} from '../events/event-log.service.js';
import {PrismaService} from '../prisma/prisma.service.js';

export type CreateOrderInput = CreateOrder;

/**
 * Transitions valides pour le cycle de vie simplifié d'une commande :
 * pending -> in_preparation -> served
 * pending | in_preparation -> cancelled
 * served et cancelled sont des états terminaux.
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['in_preparation', 'cancelled'],
  in_preparation: ['served', 'cancelled'],
  served: [],
  cancelled: [],
};

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventLog: EventLogService,
  ) {}

  list() {
    return this.prisma.order.findMany({
      include: {items: true},
      orderBy: {createdAt: 'desc'},
    });
  }

  async create(input: CreateOrderInput) {
    const order = await this.prisma.order.create({
      data: {
        tableNumber: input.tableNumber,
        waiterId: input.waiterId,
        status: 'pending',
        items: {
          create: input.items.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            constraints: item.constraints ?? [],
          })),
        },
      },
      include: {items: true},
    });

    await this.eventLog.publish('order_created', {
      orderId: order.id,
      tableNumber: order.tableNumber,
      waiterId: order.waiterId,
      items: order.items,
      status: order.status,
    });

    return order;
  }

  /**
   * Fait passer une commande de `expectedStatus` à `requestedStatus`.
   * `expectedStatus` est le dernier statut observé par l'appelant : si la
   * commande a déjà évolué entre-temps (un autre client l'a modifiée en
   * premier), on lève un conflit plutôt que d'écraser silencieusement le
   * changement concurrent.
   */
  async updateStatus(
    orderId: string,
    expectedStatus: OrderStatus,
    requestedStatus: OrderStatus,
  ) {
    const order = await this.prisma.order.findUnique({where: {id: orderId}});

    if (!order) {
      throw new NotFoundException(`Commande ${orderId} introuvable`);
    }

    if (order.status !== expectedStatus) {
      throw new ConflictException(
        `La commande ${orderId} est au statut ${order.status}, statut ${expectedStatus} attendu`,
      );
    }

    if (!ALLOWED_TRANSITIONS[order.status].includes(requestedStatus)) {
      throw new UnprocessableEntityException(
        `Impossible de faire passer la commande ${orderId} du statut ${order.status} au statut ${requestedStatus}`,
      );
    }

    const updated = await this.prisma.order.update({
      where: {id: orderId},
      data: {status: requestedStatus},
    });

    await this.eventLog.publish('order_status_updated', {
      orderId: updated.id,
      previousStatus: order.status,
      status: updated.status,
    });

    return updated;
  }
}
