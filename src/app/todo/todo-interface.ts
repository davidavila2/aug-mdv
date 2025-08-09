export interface Todo {
    id: string;
    todo: string;
    completed: boolean;
  }
  
  export const initialTodo: Todo = {
    id: '0',
    todo: '',
    completed: false,
  };