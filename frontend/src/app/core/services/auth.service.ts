import {HttpClient} from '@angular/common/http';
import {Injectable, PLATFORM_ID, inject, signal} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {firstValueFrom} from 'rxjs';
import type {SessionUser} from '@resto/shared';
import {API_BASE_URL} from '../config';

const STORAGE_KEY = 'resto-commande:session';

@Injectable({providedIn: 'root'})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly _user = signal<SessionUser | null>(this.readStoredUser());
  readonly user = this._user.asReadonly();

  async login(name: string, password: string): Promise<SessionUser> {
    const user = await firstValueFrom(
      this.http.post<SessionUser>(`${API_BASE_URL}/auth/login`, {name, password}),
    );
    this._user.set(user);
    this.writeStoredUser(user);
    return user;
  }

  logout(): void {
    this._user.set(null);
    this.writeStoredUser(null);
  }

  private readStoredUser(): SessionUser | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SessionUser) : null;
    } catch {
      return null;
    }
  }

  private writeStoredUser(user: SessionUser | null): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}
