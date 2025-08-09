import { Component, inject, signal, WritableSignal } from '@angular/core';
import { TodoList } from "./todo-list/todo-list";
import { TodoDetail } from "./todo-detail/todo-detail";
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { initialTodo, TodoI } from './todo-interface';


@Component({
  selector: 'app-todo',
  imports: [TodoList, TodoDetail],
  templateUrl: './todo.html',
  styleUrl: './todo.scss'
})
export class Todo {
  protected formBuilder = inject(FormBuilder);
  protected form!: FormGroup;
  todos: WritableSignal<TodoI[]> = signal([initialTodo]);
  selectedTodo: WritableSignal<TodoI | null> = signal(initialTodo);

  private initForm(): void {
    this.form = this.formBuilder.group({
      id: ['0', Validators.required],
      todo: ['', Validators.required],
      completed: [false],
    });
  }
}
