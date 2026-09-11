import {Component, computed, input, signal} from '@angular/core';
import type {MenuItemWithId} from '../../core/services/menu-api.service';

export type CarouselOrderItem = {
  menuItemId: string;
  quantity: number;
};

@Component({
  selector: 'app-order-photo-carousel',
  templateUrl: './order-photo-carousel.component.html',
  styleUrl: './order-photo-carousel.component.css',
})
export class OrderPhotoCarouselComponent {
  readonly items = input.required<CarouselOrderItem[]>();
  readonly menu = input.required<MenuItemWithId[]>();
  readonly size = input<'card' | 'row'>('card');

  private readonly index = signal(0);

  protected readonly position = computed(() => {
    const count = this.items().length;
    if (count === 0) {
      return 0;
    }
    return ((this.index() % count) + count) % count;
  });

  protected readonly currentItem = computed(() => this.items()[this.position()] ?? null);

  private readonly currentMenuItem = computed(() => {
    const item = this.currentItem();
    if (!item) {
      return undefined;
    }
    return this.menu().find((m) => m.id === item.menuItemId);
  });

  protected readonly currentImage = computed(() => this.currentMenuItem()?.imageUrl ?? null);
  protected readonly currentName = computed(
    () => this.currentMenuItem()?.name ?? this.currentItem()?.menuItemId ?? '',
  );
  protected readonly currentQuantity = computed(() => this.currentItem()?.quantity ?? 0);

  protected prev(): void {
    this.index.update((i) => i - 1);
  }

  protected next(): void {
    this.index.update((i) => i + 1);
  }
}
