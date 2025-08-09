import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Todo } from './todo-interface';

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  BASE_URL = 'http://localhost:3000';

  http = inject(HttpClient);

  getUrl(): string {
    return `${this.BASE_URL}/todos`;
  }

  getTodo(id: string): Observable<Todo> {
    return this.http.get<Todo>(`${this.getUrl()}/${id}`);
  }

  getTodos(): Observable<Todo[]> {
    return this.http.get<Todo[]>(`${this.getUrl()}`);
  }

  createTodo(todo: Todo): Observable<Todo> {
    return this.http.post<Todo>(this.getUrl(), todo);
  }

  updateTodo(todo: Todo): Observable<Todo> {
    return this.http.put<Todo>(`${this.getUrl()}/${todo.id}`, todo);
  }

  deleteTodo(id: string): Observable<void> {
    return this.http.delete<void>(`${this.getUrl()}/${id}`);
  }
}
