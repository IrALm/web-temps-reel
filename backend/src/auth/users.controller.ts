import {Controller, Get} from '@nestjs/common';
import {AuthService} from './auth.service.js';

/** Annuaire minimal (id, nom, rôle — jamais le mot de passe) pour l'affichage frontend (ex. auteurs du chat). */
@Controller('users')
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  list() {
    return this.authService.listUsers();
  }
}
