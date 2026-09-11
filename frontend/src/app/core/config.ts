/**
 * Adresses du backend. Tout passe par le reverse proxy nginx sur la même
 * origine que le frontend (voir proxy/nginx.conf) : les chemins REST/SSE
 * sont donc relatifs (`/api/...`), sans avoir à connaître l'hôte.
 *
 * Les URL WebSocket/Socket.IO doivent en revanche être construites
 * explicitement (ws:// ou wss:// selon le protocole de la page) — calculées
 * ici uniquement au moment de l'appel (jamais à l'import du module), pour
 * rester compatible avec le rendu côté serveur (SSR) où `window` n'existe
 * pas.
 */
export const API_BASE_URL = '/api';

function wsBase(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}`;
}

export function wsOrdersUrl(): string {
  return `${wsBase()}/ws/orders`;
}

export function wsChatUrl(): string {
  return `${wsBase()}/ws/chat`;
}

export function socketIoUrl(): string {
  return window.location.origin;
}
