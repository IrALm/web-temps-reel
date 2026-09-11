import {DatePipe} from '@angular/common';
import {Component, OnDestroy, OnInit, computed, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import type {SessionUser} from '@resto/shared';
import {AuthService} from '../../core/services/auth.service';
import {ChatSocketService} from '../../core/services/chat-socket.service';
import {RealtimeOrdersService} from '../../core/services/realtime-orders.service';
import {UsersApiService} from '../../core/services/users-api.service';

const GENERAL_CHANNEL = 'restaurant-general';

@Component({
  selector: 'app-chat',
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent implements OnInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  protected readonly chat = inject(ChatSocketService);
  private readonly realtimeOrders = inject(RealtimeOrdersService);
  private readonly usersApi = inject(UsersApiService);

  protected readonly activeChannel = signal(GENERAL_CHANNEL);
  protected draft = '';
  private readonly users = signal<SessionUser[]>([]);

  protected readonly channels = computed(() => [
    {id: GENERAL_CHANNEL, name: 'Général'},
    ...this.realtimeOrders
      .orders()
      .filter((o) => o.status !== 'cancelled')
      .map((o) => ({id: `order-${o.id}`, name: `Commande — Table ${o.tableNumber}`})),
  ]);

  async ngOnInit(): Promise<void> {
    this.users.set(await this.usersApi.list());
    await this.select(GENERAL_CHANNEL);
  }

  ngOnDestroy(): void {
    this.chat.disconnect();
  }

  protected async select(channelId: string): Promise<void> {
    this.activeChannel.set(channelId);
    await this.chat.joinChannel(channelId);
  }

  protected send(): void {
    if (!this.draft.trim()) return;
    this.chat.send(this.draft);
    this.draft = '';
  }

  protected isMine(authorId: string): boolean {
    return authorId === this.auth.user()?.id;
  }

  protected authorName(authorId: string): string {
    if (this.isMine(authorId)) return 'Vous';
    return this.users().find((u) => u.id === authorId)?.name ?? authorId;
  }

  protected channelName(id: string): string {
    return this.channels().find((c) => c.id === id)?.name ?? id;
  }
}
