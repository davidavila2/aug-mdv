import { Component, input, output } from '@angular/core';
import { TodoI } from '../todo-interface';

@Component({
  selector: 'app-todo-list',
  imports: [],
  templateUrl: './todo-list.html',
  styleUrl: './todo-list.scss'
})
export class TodoList {
  todos = input.required<TodoI[]>();
  selectedTodo = output<TodoI>();
  selected = input<TodoI | null>();
  deletedTodo = output<string>();
  viewMore = output<string>();

  select(todo: TodoI): void {
    this.selectedTodo.emit(todo);
  }

  delete(id: string): void {
    this.deletedTodo.emit(id);
  }

  moreDetails(id: string): void {
    this.viewMore.emit(id);
  }
}
