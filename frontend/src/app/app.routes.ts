import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'orders' },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'orders',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/orders/orders-board.component').then((m) => m.OrdersBoardComponent),
  },
  {
    path: 'chat',
    canActivate: [authGuard],
    loadComponent: () => import('./features/chat/chat.component').then((m) => m.ChatComponent),
  },
  { path: '**', redirectTo: 'orders' },
];
