import {Injectable, signal} from '@angular/core';
import type {RealtimeMode} from './realtime-orders.service';

export type NetworkLogEntry = {
  id: number;
  timestamp: Date;
  strategy: RealtimeMode | 'chat';
  kind: 'request' | 'event' | 'lifecycle' | 'error';
  label: string;
  latencyMs: number | null;
  status: string;
};

const MAX_ENTRIES = 200;

/** Journal des requêtes/événements réseau, tous mécanismes confondus —
 * alimente le panneau de performance façon onglet Network des devtools. */
@Injectable({providedIn: 'root'})
export class NetworkMonitorService {
  private readonly _entries = signal<NetworkLogEntry[]>([]);
  readonly entries = this._entries.asReadonly();
  private nextId = 1;

  record(entry: Omit<NetworkLogEntry, 'id' | 'timestamp'>): void {
    const full: NetworkLogEntry = {
      ...entry,
      id: this.nextId++,
      timestamp: new Date(),
    };
    this._entries.update((list) => [full, ...list].slice(0, MAX_ENTRIES));
  }

  clear(): void {
    this._entries.set([]);
  }
}
