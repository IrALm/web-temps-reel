import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import type {ChatMessage} from '@resto/shared';
import {API_BASE_URL} from '../config';

export type ChatMessageWithId = ChatMessage & {id: string};

@Injectable({providedIn: 'root'})
export class ChatApiService {
  private readonly http = inject(HttpClient);

  history(channelId: string): Promise<ChatMessageWithId[]> {
    return firstValueFrom(
      this.http.get<ChatMessageWithId[]>(`${API_BASE_URL}/chat/${channelId}/messages`),
    );
  }
}
