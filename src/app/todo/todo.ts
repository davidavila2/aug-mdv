import { Component } from '@angular/core';
import { TodoList } from "./todo-list/todo-list";
import { TodoDetail } from "./todo-detail/todo-detail";

@Component({
  selector: 'app-todo',
  imports: [TodoList, TodoDetail],
  templateUrl: './todo.html',
  styleUrl: './todo.scss'
})
export class Todo {

}
