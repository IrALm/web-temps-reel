import { RenderMode, ServerRoute } from '@angular/ssr';

// Application temps réel authentifiée (localStorage, WebSocket, EventSource,
// Socket.IO côté navigateur) : le prérendu/SSR n'a pas de sens ici, on sert
// un shell client pur pour toutes les routes.
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
