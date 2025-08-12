import { Component, inject, WritableSignal, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TodoService } from '../todo-service';
import { initialTodo, TodoI } from '../todo-interface';

@Component({
  selector: 'app-todo-view',
  imports: [],
  templateUrl: './todo-view.html',
  styleUrl: './todo-view.scss'
})
export class TodoView {
  router = inject(Router);
  activatedRoute = inject(ActivatedRoute);
  todoService = inject(TodoService);
  todo: WritableSignal<TodoI> = signal(initialTodo);

  constructor() {
    this.activatedRoute.params.subscribe((params) => {
      this.todoService.getTodo(params['id']).subscribe((todo) => {
        this.todo.set(todo)
      })
    })
  }

  goBack(): void {
    this.router.navigate(['/todos']);
  }
}
