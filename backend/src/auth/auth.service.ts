import {Injectable, UnauthorizedException} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type {UserRole} from '@resto/shared';
import {PrismaService} from '../prisma/prisma.service.js';

export type AuthenticatedUser = {
  id: string;
  name: string;
  role: UserRole;
};

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async validateCredentials(
    name: string,
    password: string,
  ): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirst({where: {name}});

    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    return {id: user.id, name: user.name, role: user.role};
  }

  /**
   * Utilisé pour l'authentification au handshake Socket.IO : le client
   * fournit un identifiant utilisateur, le serveur va chercher son rôle
   * réel en base plutôt que de faire confiance à ce que le client prétend.
   * `null` si l'identifiant ne correspond à aucun compte.
   */
  async findById(id: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({where: {id}});
    return user ? {id: user.id, name: user.name, role: user.role} : null;
  }

  /** Annuaire minimal utilisé par le frontend pour afficher les noms des auteurs dans le chat. */
  listUsers(): Promise<AuthenticatedUser[]> {
    return this.prisma.user.findMany({
      select: {id: true, name: true, role: true},
      orderBy: {name: 'asc'},
    });
  }
}
