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
}
