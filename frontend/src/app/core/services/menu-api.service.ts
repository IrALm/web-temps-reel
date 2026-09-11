import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import type {MenuItem} from '@resto/shared';
import {API_BASE_URL} from '../config';

export type MenuItemWithId = MenuItem & {id: string};

@Injectable({providedIn: 'root'})
export class MenuApiService {
  private readonly http = inject(HttpClient);

  list(): Promise<MenuItemWithId[]> {
    return firstValueFrom(this.http.get<MenuItemWithId[]>(`${API_BASE_URL}/menu-items`));
  }
}
