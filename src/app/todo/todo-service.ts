import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TodoI } from './todo-interface';

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  BASE_URL = 'http://localhost:3000';

  http = inject(HttpClient);

  getUrl(): string {
    return `${this.BASE_URL}/todos`;
  }

  getTodo(id: string): Observable<TodoI> {
    return this.http.get<TodoI>(`${this.getUrl()}/${id}`);
  }

  getTodos(): Observable<TodoI[]> {
    return this.http.get<TodoI[]>(`${this.getUrl()}`);
  }

  createTodo(todo: TodoI): Observable<TodoI> {
    return this.http.post<TodoI>(this.getUrl(), todo);
  }

  updateTodo(todo: TodoI): Observable<TodoI> {
    return this.http.put<TodoI>(`${this.getUrl()}/${todo.id}`, todo);
  }

  deleteTodo(id: string): Observable<void> {
    return this.http.delete<void>(`${this.getUrl()}/${id}`);
  }
}
