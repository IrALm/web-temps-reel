import {Component, inject, input, output} from '@angular/core';
import {NetworkMonitorService} from '../../core/services/network-monitor.service';

@Component({
  selector: 'app-performance-panel',
  templateUrl: './performance-panel.component.html',
  styleUrl: './performance-panel.component.css',
})
export class PerformancePanelComponent {
  protected readonly monitor = inject(NetworkMonitorService);

  readonly open = input(false);
  readonly closeRequested = output<void>();

  protected close(): void {
    this.closeRequested.emit();
  }

  protected formatTime(date: Date): string {
    return date.toLocaleTimeString('fr-FR', {hour12: false});
  }

  private readonly strategyLabels: Record<string, string> = {
    polling: 'Polling',
    'long-polling': 'Long poll.',
    sse: 'SSE',
    websocket: 'WebSocket',
    socketio: 'Socket.IO',
    chat: 'Chat',
  };

  protected strategyLabel(strategy: string): string {
    return this.strategyLabels[strategy] ?? strategy;
  }
}
