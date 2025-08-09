import { Routes } from '@angular/router';
import { Todo } from './todo/todo';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'todos',
        pathMatch: 'full',
      },
      {
        path: 'todos',
        component: Todo,
      }
];
