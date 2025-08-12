import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { initialTodo, TodoI } from './todo-interface';

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  BASE_URL = 'https://vercel-database-7ezw783o4-davidavila2s-projects.vercel.app';

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

  updateTodo(id: string,  todo: TodoI): Observable<TodoI> {
    return this.http.put<TodoI>(`${this.getUrl()}/${id}`, todo);
  }

  deleteTodo(id: string): Observable<void> {
    return this.http.delete<void>(`${this.getUrl()}/${id}`);
  }
}
