import {Injectable} from '@nestjs/common';
import {HttpAdapterHost} from '@nestjs/core';
import type {WebSocketServer} from 'ws';

/**
 * Node n'autorise qu'un seul jeu de gestionnaux `upgrade` "propre" par
 * serveur HTTP : brancher plusieurs `new WebSocketServer({server, path})`
 * indépendamment sur le même serveur (un pour `/ws/chat`, un pour
 * `/ws/orders`) corrompt les deux connexions (chacun répond à l'upgrade
 * HTTP, quel que soit le chemin). Ce routeur centralise donc l'unique
 * écouteur `upgrade` du serveur HTTP et redistribue vers le bon
 * `WebSocketServer` (créé avec `{noServer: true}`) selon le chemin de la
 * requête — chaque gateway (`ChatWsGateway`, `OrderWsGateway`) s'enregistre
 * ici au lieu d'attacher son propre écouteur.
 */
@Injectable()
export class WsUpgradeRouter {
  private readonly servers = new Map<string, WebSocketServer>();
  private attached = false;

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  register(path: string, wss: WebSocketServer) {
    this.servers.set(path, wss);
    this.attachOnce();
  }

  private attachOnce() {
    if (this.attached) {
      return;
    }
    const httpServer = this.httpAdapterHost.httpAdapter.getHttpServer();
    this.attached = true;

    httpServer.on('upgrade', (request: any, socket: any, head: Buffer) => {
      const pathname = new URL(request.url ?? '', 'http://localhost').pathname;
      const wss = this.servers.get(pathname);

      if (!wss) {
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    });
  }
}
