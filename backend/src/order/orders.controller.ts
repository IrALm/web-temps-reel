import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Sse,
  UnauthorizedException,
} from '@nestjs/common';
import {
  orderCreateCommandSchema,
  updateOrderStatusSchema,
  type OrderCreateCommand,
  type UpdateOrderStatus,
} from '@resto/shared';
import {AuthService} from '../auth/auth.service.js';
import {ZodValidationPipe} from '../common/zod-validation.pipe.js';
import {OrderAuthorizationService} from './order-authorization.service.js';
import {OrderSseService} from './order-sse.service.js';
import {OrderUpdatesService} from './order-updates.service.js';
import {OrderService} from './order.service.js';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orderService: OrderService,
    private readonly orderUpdates: OrderUpdatesService,
    private readonly orderSse: OrderSseService,
    private readonly authService: AuthService,
    private readonly orderAuth: OrderAuthorizationService,
  ) {}

  @Get()
  list() {
    return this.orderService.list();
  }

  /**
   * Long polling : la requête reste ouverte jusqu'à ce qu'un nouvel
   * événement de commande arrive (ou jusqu'au timeout). Le client rappelle
   * cet endpoint en boucle avec `after` = le plus grand `eventId` déjà vu.
   */
  @Get('updates')
  updates(@Query('after') after?: string) {
    const cursor = after ? Number(after) : 0;
    return this.orderUpdates.waitForUpdates(Number.isFinite(cursor) ? cursor : 0);
  }

  /**
   * SSE : flux Server-Sent Events. `Last-Event-ID` est renvoyé
   * automatiquement par `EventSource` à la reconnexion ; `after` est le
   * repli pour la toute première connexion (ou un client non-navigateur).
   */
  @Sse('stream')
  stream(
    @Headers('last-event-id') lastEventId?: string,
    @Query('after') after?: string,
  ) {
    const cursor = Number(lastEventId ?? after ?? 0);
    return this.orderSse.streamSince(Number.isFinite(cursor) ? cursor : 0);
  }

  /**
   * Comme pour Socket.IO : l'identité vient de `x-user-id` (résolue côté
   * serveur), jamais d'un `waiterId` fourni dans le corps de la requête.
   * Simplification pédagogique — un vrai déploiement utiliserait un token
   * signé plutôt qu'un identifiant brut dans un header.
   */
  @Post()
  async create(
    @Headers('x-user-id') userId: string | undefined,
    @Body(new ZodValidationPipe(orderCreateCommandSchema)) body: OrderCreateCommand,
  ) {
    const user = await this.requireUser(userId);
    if (!this.orderAuth.canCreate(user.role)) {
      throw new ForbiddenException('Ce rôle ne peut pas créer de commande');
    }
    return this.orderService.create({...body, waiterId: user.id});
  }

  @Patch(':id/status')
  async updateStatus(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateOrderStatusSchema))
    body: UpdateOrderStatus,
  ) {
    const user = await this.requireUser(userId);
    if (!this.orderAuth.canUpdateStatus(user.role, body.requestedStatus)) {
      throw new ForbiddenException('Ce rôle ne peut pas appliquer cette transition');
    }
    return this.orderService.updateStatus(
      id,
      body.expectedStatus,
      body.requestedStatus,
    );
  }

  private async requireUser(userId: string | undefined) {
    if (!userId) {
      throw new UnauthorizedException('En-tête x-user-id manquant');
    }
    const user = await this.authService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Utilisateur inconnu');
    }
    return user;
  }
}
