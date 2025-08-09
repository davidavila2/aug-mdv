export interface TodoI {
    id: string;
    todo: string;
    completed: boolean;
}
  
export const initialTodo: TodoI = {
    id: '0',
    todo: '',
    completed: false,
};