import { Routes } from '@angular/router';
import { Todo } from './todo/todo';
import { TodoView } from './todo/todo-view/todo-view';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'todos',
        pathMatch: 'full',
      },
      {
        path: 'todos',
        component: Todo,
      },
      {
        path: 'todos/:id',
        component: TodoView
      }
];
