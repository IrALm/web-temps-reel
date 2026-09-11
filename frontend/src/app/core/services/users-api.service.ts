import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import type {SessionUser} from '@resto/shared';
import {API_BASE_URL} from '../config';

@Injectable({providedIn: 'root'})
export class UsersApiService {
  private readonly http = inject(HttpClient);

  list(): Promise<SessionUser[]> {
    return firstValueFrom(this.http.get<SessionUser[]>(`${API_BASE_URL}/users`));
  }
}
