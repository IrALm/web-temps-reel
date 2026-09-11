import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import type {CreateOrder, Order, OrderStatus} from '@resto/shared';
import {API_BASE_URL} from '../config';

export type OrderWithId = Order & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

/** Mutations REST — utilisées quel que soit le mode temps réel choisi pour
 * RECEVOIR les mises à jour (voir RealtimeOrdersService). */
@Injectable({providedIn: 'root'})
export class OrdersApiService {
  private readonly http = inject(HttpClient);

  list(): Promise<OrderWithId[]> {
    return firstValueFrom(this.http.get<OrderWithId[]>(`${API_BASE_URL}/orders`));
  }

  create(input: Omit<CreateOrder, 'waiterId'>): Promise<OrderWithId> {
    return firstValueFrom(
      this.http.post<OrderWithId>(`${API_BASE_URL}/orders`, input),
    );
  }

  updateStatus(
    orderId: string,
    expectedStatus: OrderStatus,
    requestedStatus: OrderStatus,
  ): Promise<OrderWithId> {
    return firstValueFrom(
      this.http.patch<OrderWithId>(`${API_BASE_URL}/orders/${orderId}/status`, {
        expectedStatus,
        requestedStatus,
      }),
    );
  }
}
