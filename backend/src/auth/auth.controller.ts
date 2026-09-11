import {Body, Controller, Post} from '@nestjs/common';
import {loginSchema, type Login} from '@resto/shared';
import {ZodValidationPipe} from '../common/zod-validation.pipe.js';
import {AuthService} from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body(new ZodValidationPipe(loginSchema)) body: Login) {
    return this.authService.validateCredentials(body.name, body.password);
  }
}
