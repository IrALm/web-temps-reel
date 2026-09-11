import {Injectable} from '@nestjs/common';
import type {OrderStatus, UserRole} from '@resto/shared';

/**
 * Règles d'autorisation pour les actions sur une commande — partagées entre
 * `OrdersController` (REST) et `RealtimeGateway` (Socket.IO) pour éviter
 * que les deux transports divergent sur qui a le droit de faire quoi.
 */
@Injectable()
export class OrderAuthorizationService {
  canCreate(role: UserRole): boolean {
    return role === 'waiter' || role === 'manager';
  }

  canUpdateStatus(role: UserRole, requestedStatus: OrderStatus): boolean {
    if (requestedStatus === 'cancelled') {
      return role === 'manager';
    }
    return role === 'cook' || role === 'manager';
  }
}
