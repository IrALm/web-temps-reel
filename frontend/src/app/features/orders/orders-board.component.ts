import {DatePipe, DecimalPipe} from '@angular/common';
import {Component, OnDestroy, OnInit, computed, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import type {OrderStatus} from '@resto/shared';
import {AuthService} from '../../core/services/auth.service';
import {type MenuItemWithId, MenuApiService} from '../../core/services/menu-api.service';
import {type OrderWithId, OrdersApiService} from '../../core/services/orders-api.service';
import {RealtimeOrdersService} from '../../core/services/realtime-orders.service';
import {ModeSelectorComponent} from '../../shared/mode-selector/mode-selector.component';
import {ORDER_STATUS_META} from '../../shared/order-status';
import {PerformancePanelComponent} from '../../shared/performance-panel/performance-panel.component';

@Component({
  selector: 'app-orders-board',
  imports: [
    FormsModule,
    RouterLink,
    DatePipe,
    DecimalPipe,
    ModeSelectorComponent,
    PerformancePanelComponent,
  ],
  templateUrl: './orders-board.component.html',
  styleUrl: './orders-board.component.css',
})
export class OrdersBoardComponent implements OnInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  protected readonly realtime = inject(RealtimeOrdersService);
  private readonly ordersApi = inject(OrdersApiService);
  private readonly menuApi = inject(MenuApiService);
  private readonly router = inject(Router);

  protected readonly statusMeta = ORDER_STATUS_META;
  protected readonly perfOpen = signal(true);
  protected readonly menu = signal<MenuItemWithId[]>([]);
  protected readonly actionError = signal<string | null>(null);

  protected readonly role = computed(() => this.auth.user()?.role);
  protected readonly roleLabel = computed(() => {
    switch (this.role()) {
      case 'manager':
        return 'Responsable';
      case 'waiter':
        return 'Serveur';
      case 'cook':
        return 'Cuisine';
      default:
        return '';
    }
  });

  protected readonly myOrders = computed(() => {
    const me = this.auth.user()?.id;
    return this.realtime
      .orders()
      .filter((o) => o.waiterId === me)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  protected readonly todo = computed(() =>
    this.realtime.orders().filter((o) => o.status === 'pending'),
  );
  protected readonly inProgress = computed(() =>
    this.realtime.orders().filter((o) => o.status === 'in_preparation'),
  );
  protected readonly ready = computed(() =>
    this.realtime.orders().filter((o) => o.status === 'served'),
  );

  protected readonly allOrders = computed(() =>
    [...this.realtime.orders()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
  protected readonly countActive = computed(
    () =>
      this.realtime.orders().filter((o) => o.status === 'pending' || o.status === 'in_preparation')
        .length,
  );
  protected readonly countServed = computed(
    () => this.realtime.orders().filter((o) => o.status === 'served').length,
  );
  protected readonly countCancelled = computed(
    () => this.realtime.orders().filter((o) => o.status === 'cancelled').length,
  );

  // Formulaire de création (vue Serveur)
  // `<input type="number">` + ngModel lie une valeur numérique (ou `null`
  // si vide), jamais une string — contrairement à un input texte classique.
  protected table: number | null = null;
  private readonly quantities = signal<Record<string, number>>({});
  private readonly constraintTexts = signal<Record<string, string>>({});

  async ngOnInit(): Promise<void> {
    void this.realtime.setMode(this.realtime.mode());
    this.menu.set(await this.menuApi.list());
  }

  ngOnDestroy(): void {
    this.realtime.teardown();
  }

  protected menuItemName(id: string): string {
    return this.menu().find((m) => m.id === id)?.name ?? id;
  }

  protected qty(id: string): number {
    return this.quantities()[id] ?? 0;
  }

  protected incQty(id: string): void {
    this.quantities.update((q) => ({...q, [id]: (q[id] ?? 0) + 1}));
  }

  protected decQty(id: string): void {
    this.quantities.update((q) => ({...q, [id]: Math.max(0, (q[id] ?? 0) - 1)}));
  }

  protected constraintFor(id: string): string {
    return this.constraintTexts()[id] ?? '';
  }

  protected setConstraint(id: string, value: string): void {
    this.constraintTexts.update((c) => ({...c, [id]: value}));
  }

  protected async submitOrder(): Promise<void> {
    const items = this.menu()
      .map((m) => ({
        menuItemId: m.id,
        quantity: this.qty(m.id),
        constraints: this.constraintFor(m.id).trim() ? [this.constraintFor(m.id).trim()] : [],
      }))
      .filter((i) => i.quantity > 0);

    if (!this.table || items.length === 0) {
      return;
    }

    await this.runAction(async () => {
      await this.ordersApi.create({tableNumber: this.table!, items});
      this.table = null;
      this.quantities.set({});
      this.constraintTexts.set({});
    });
  }

  protected async advance(order: OrderWithId, next: OrderStatus): Promise<void> {
    await this.runAction(() => this.ordersApi.updateStatus(order.id, order.status, next));
  }

  protected async cancel(order: OrderWithId): Promise<void> {
    await this.runAction(() => this.ordersApi.updateStatus(order.id, order.status, 'cancelled'));
  }

  protected logout(): void {
    this.realtime.teardown();
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  private async runAction(fn: () => Promise<unknown>): Promise<void> {
    this.actionError.set(null);
    try {
      await fn();
    } catch (error: any) {
      const message = error?.error?.message;
      this.actionError.set(
        Array.isArray(message) ? message.join(', ') : message ?? 'Action refusée.',
      );
    }
  }
}
