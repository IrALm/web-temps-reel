import {Component, inject} from '@angular/core';
import {REALTIME_MODES, RealtimeOrdersService} from '../../core/services/realtime-orders.service';

@Component({
  selector: 'app-mode-selector',
  templateUrl: './mode-selector.component.html',
  styleUrl: './mode-selector.component.css',
})
export class ModeSelectorComponent {
  protected readonly realtime = inject(RealtimeOrdersService);
  protected readonly modes = REALTIME_MODES;

  protected select(value: (typeof REALTIME_MODES)[number]['value']): void {
    void this.realtime.setMode(value);
  }
}
