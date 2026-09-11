import {isPlatformBrowser} from '@angular/common';
import {Injectable, PLATFORM_ID, inject, signal} from '@angular/core';
import {io, type Socket} from 'socket.io-client';
import {
  orderCreatedEventSchema,
  orderStatusUpdatedEventSchema,
} from '@resto/shared';
import {API_BASE_URL, socketIoUrl, wsOrdersUrl} from '../config';
import {AuthService} from './auth.service';
import {NetworkMonitorService} from './network-monitor.service';
import {OrdersApiService, type OrderWithId} from './orders-api.service';

export type RealtimeMode = 'polling' | 'long-polling' | 'sse' | 'websocket' | 'socketio';

export const REALTIME_MODES: {value: RealtimeMode; label: string}[] = [
  {value: 'polling', label: 'Polling'},
  {value: 'long-polling', label: 'Long polling'},
  {value: 'sse', label: 'SSE'},
  {value: 'websocket', label: 'WebSocket'},
  {value: 'socketio', label: 'Socket.IO'},
];

const POLLING_INTERVAL_MS = 4000;

type AppliedEvent = {eventId: number; createdAt: Date; label: string};

/**
 * Point central du sélecteur de mode : maintient la liste des commandes à
 * jour en s'appuyant tour à tour sur l'un des 5 mécanismes temps réel, et
 * journalise chaque requête/événement dans `NetworkMonitorService`.
 *
 * Les mutations (créer une commande, changer son statut) passent toujours
 * par `OrdersApiService` (REST), quel que soit le mode actif — seule la
 * manière de RECEVOIR les mises à jour change d'un mode à l'autre.
 */
@Injectable({providedIn: 'root'})
export class RealtimeOrdersService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly monitor = inject(NetworkMonitorService);
  private readonly ordersApi = inject(OrdersApiService);
  private readonly authService = inject(AuthService);

  readonly mode = signal<RealtimeMode>('polling');
  readonly orders = signal<OrderWithId[]>([]);

  private cursor = 0;
  private abortController: AbortController | null = null;
  private socket: Socket | null = null;

  async setMode(mode: RealtimeMode): Promise<void> {
    this.teardown();
    this.mode.set(mode);
    this.cursor = 0;
    this.orders.set([]);
    this.monitor.clear();

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    switch (mode) {
      case 'polling':
        this.startPolling(signal);
        break;
      case 'long-polling':
        void this.startLongPolling(signal);
        break;
      case 'sse':
        this.startSse(signal);
        break;
      case 'websocket':
        this.startWebSocket(signal);
        break;
      case 'socketio': {
        const userId = this.authService.user()?.id;
        if (userId) {
          this.startSocketIo(signal, userId);
        }
        break;
      }
    }
  }

  teardown(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.socket?.close();
    this.socket = null;
  }

  // --- Polling -------------------------------------------------------

  private startPolling(signal: AbortSignal): void {
    const tick = async () => {
      if (signal.aborted) return;
      const start = performance.now();
      try {
        const res = await fetch(`${API_BASE_URL}/orders`, {signal});
        const latencyMs = Math.round(performance.now() - start);
        const data = (await res.json()) as OrderWithId[];
        this.monitor.record({
          strategy: 'polling',
          kind: 'request',
          label: 'GET /orders',
          latencyMs,
          status: String(res.status),
        });
        this.orders.set(data);
      } catch {
        if (!signal.aborted) {
          this.monitor.record({
            strategy: 'polling',
            kind: 'error',
            label: 'GET /orders',
            latencyMs: null,
            status: 'network_error',
          });
        }
      }
    };

    void tick();
    const timer = setInterval(tick, POLLING_INTERVAL_MS);
    signal.addEventListener('abort', () => clearInterval(timer));
  }

  // --- Long polling ----------------------------------------------------

  private async startLongPolling(signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
      const start = performance.now();
      let res: Response;
      try {
        res = await fetch(`${API_BASE_URL}/orders/updates?after=${this.cursor}`, {
          signal,
        });
      } catch {
        if (signal.aborted) return;
        this.monitor.record({
          strategy: 'long-polling',
          kind: 'error',
          label: 'GET /orders/updates',
          latencyMs: null,
          status: 'network_error',
        });
        await this.sleep(1000);
        continue;
      }

      const latencyMs = Math.round(performance.now() - start);
      const events = (await res.json()) as unknown[];
      this.monitor.record({
        strategy: 'long-polling',
        kind: 'request',
        label: `GET /orders/updates?after=${this.cursor}`,
        latencyMs,
        status: events.length > 0 ? String(res.status) : `${res.status} (timeout)`,
      });

      for (const raw of events) {
        const applied = this.applyEvent(raw);
        if (applied) {
          this.cursor = Math.max(this.cursor, applied.eventId);
        }
      }
    }
  }

  // --- SSE ---------------------------------------------------------------

  private startSse(signal: AbortSignal): void {
    const es = new EventSource(`${API_BASE_URL}/orders/stream?after=${this.cursor}`);

    const onOrderEvent = (e: MessageEvent) => {
      const raw = JSON.parse(e.data);
      const applied = this.applyEvent(raw);
      if (applied) {
        this.cursor = Math.max(this.cursor, applied.eventId);
        this.recordPushLatency('sse', applied.label, applied.createdAt);
      }
    };

    es.addEventListener('order:created', onOrderEvent);
    es.addEventListener('order:status-updated', onOrderEvent);
    es.onopen = () =>
      this.monitor.record({
        strategy: 'sse',
        kind: 'lifecycle',
        label: 'connexion ouverte',
        latencyMs: null,
        status: 'open',
      });
    es.onerror = () =>
      this.monitor.record({
        strategy: 'sse',
        kind: 'lifecycle',
        label: 'erreur / reconnexion',
        latencyMs: null,
        status: 'error',
      });

    signal.addEventListener('abort', () => es.close());
  }

  // --- WebSocket natif -----------------------------------------------

  private startWebSocket(signal: AbortSignal): void {
    const ws = new WebSocket(`${wsOrdersUrl()}?after=${this.cursor}`);

    ws.onopen = () =>
      this.monitor.record({
        strategy: 'websocket',
        kind: 'lifecycle',
        label: 'connexion ouverte',
        latencyMs: null,
        status: 'open',
      });
    ws.onmessage = (ev) => {
      const raw = JSON.parse(ev.data);
      const applied = this.applyEvent(raw);
      if (applied) {
        this.cursor = Math.max(this.cursor, applied.eventId);
        this.recordPushLatency('websocket', applied.label, applied.createdAt);
      }
    };
    ws.onclose = () =>
      this.monitor.record({
        strategy: 'websocket',
        kind: 'lifecycle',
        label: 'déconnexion',
        latencyMs: null,
        status: 'closed',
      });
    ws.onerror = () =>
      this.monitor.record({
        strategy: 'websocket',
        kind: 'lifecycle',
        label: 'erreur',
        latencyMs: null,
        status: 'error',
      });

    signal.addEventListener('abort', () => ws.close());
  }

  // --- Socket.IO -----------------------------------------------------

  private startSocketIo(signal: AbortSignal, userId: string): void {
    const socket = io(socketIoUrl(), {auth: {userId}});
    this.socket = socket;

    socket.on('connect', () => {
      this.monitor.record({
        strategy: 'socketio',
        kind: 'lifecycle',
        label: 'connexion ouverte',
        latencyMs: null,
        status: 'open',
      });
      void this.ordersApi.list().then((list) => this.orders.set(list));
    });

    const onOrderEvent = (label: string) => (raw: unknown) => {
      const applied = this.applyEvent(raw);
      if (applied) {
        this.recordPushLatency('socketio', label, applied.createdAt);
      }
    };

    socket.on('order:created', onOrderEvent('order:created'));
    socket.on('order:status-updated', onOrderEvent('order:status-updated'));
    socket.on('disconnect', () =>
      this.monitor.record({
        strategy: 'socketio',
        kind: 'lifecycle',
        label: 'déconnexion',
        latencyMs: null,
        status: 'closed',
      }),
    );
    socket.on('connect_error', () =>
      this.monitor.record({
        strategy: 'socketio',
        kind: 'lifecycle',
        label: 'erreur de connexion',
        latencyMs: null,
        status: 'error',
      }),
    );

    signal.addEventListener('abort', () => socket.close());
  }

  // --- Application des événements au state local ----------------------

  private applyEvent(raw: unknown): AppliedEvent | null {
    const created = orderCreatedEventSchema.safeParse(raw);
    if (created.success) {
      const evt = created.data;
      this.upsertOrder({
        id: evt.orderId,
        tableNumber: evt.tableNumber,
        waiterId: evt.waiterId,
        items: evt.items,
        status: evt.status,
        createdAt: evt.createdAt.toISOString(),
        updatedAt: evt.createdAt.toISOString(),
      });
      return {eventId: evt.eventId, createdAt: evt.createdAt, label: 'order:created'};
    }

    const updated = orderStatusUpdatedEventSchema.safeParse(raw);
    if (updated.success) {
      const evt = updated.data;
      this.orders.update((list) =>
        list.map((o) =>
          o.id === evt.orderId
            ? {...o, status: evt.status, updatedAt: evt.createdAt.toISOString()}
            : o,
        ),
      );
      return {
        eventId: evt.eventId,
        createdAt: evt.createdAt,
        label: 'order:status-updated',
      };
    }

    return null;
  }

  private upsertOrder(order: OrderWithId): void {
    this.orders.update((list) =>
      list.some((o) => o.id === order.id) ? list : [order, ...list],
    );
  }

  private recordPushLatency(strategy: RealtimeMode, label: string, createdAt: Date): void {
    const latencyMs = Math.max(0, Math.round(Date.now() - createdAt.getTime()));
    this.monitor.record({strategy, kind: 'event', label, latencyMs, status: 'push'});
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
