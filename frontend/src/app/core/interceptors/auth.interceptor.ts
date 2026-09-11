import {HttpInterceptorFn} from '@angular/common/http';
import {inject} from '@angular/core';
import {AuthService} from '../services/auth.service';

/** Ajoute `x-user-id` à chaque requête vers le backend — c'est ce que les
 * endpoints REST protégés (création/changement de statut de commande)
 * utilisent pour retrouver l'utilisateur authentifié côté serveur. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const user = auth.user();

  if (!user) {
    return next(req);
  }

  return next(req.clone({setHeaders: {'x-user-id': user.id}}));
};
