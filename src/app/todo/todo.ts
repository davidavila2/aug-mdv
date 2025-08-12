import { Component, inject, signal, WritableSignal, OnInit, DestroyRef } from '@angular/core';
import { TodoList } from "./todo-list/todo-list";
import { TodoDetail } from "./todo-detail/todo-detail";
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { initialTodo, TodoI } from './todo-interface';
import { TodoService } from './todo-service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

@Component({
  selector: 'app-todo',
  imports: [TodoList, TodoDetail],
  templateUrl: './todo.html',
  styleUrl: './todo.scss'
})
export class Todo implements OnInit {
  protected formBuilder = inject(FormBuilder);
  protected form!: FormGroup;
  protected todos: WritableSignal<TodoI[]> = signal([initialTodo]);
  protected selectedTodo: WritableSignal<TodoI | null> = signal(initialTodo);
  protected todoService = inject(TodoService);
  router = inject(Router);
  destroyRef = inject(DestroyRef);


  ngOnInit(): void {
    this.initForm();
    this.getTodos();
  }

  protected getTodo(id: string): void {
    this.router.navigate(['todos', id]);

    // this.todoService.getTodo(id).pipe(
    //   takeUntilDestroyed(this.destroyRef)
    // ).subscribe((value) => {
    //   this.selectedTodo.set(value)
    // })
  }

  private getTodos(): void {
    this.todoService.getTodos().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((value) => {
      this.todos.set(value);
    });
  }

  private createTodo(todo: TodoI): void {
    this.todoService.createTodo({
      ...todo,
      id: `${Math.floor(Math.random() * 1000)}`,
    }).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((newTodo) => {
      this.todos().push(newTodo);

      this.getTodos();
    })
  }

  private updateTodo(todo: TodoI): void {
    this.todoService.updateTodo(todo.id, todo).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((updatedTodo) => {
      this.todos().map(t => (t.id === updatedTodo.id ? updatedTodo : t))
      this.getTodos()
    })
  }

  protected saveTodo(todo: TodoI): void {
    if(!todo.id || todo.id === '0') {
      this.createTodo(todo)
    } else {
      this.updateTodo(todo)
    }

    this.clearTodo();
  }

  protected selectTodo(todo: TodoI): void {
    this.selectedTodo.set(todo);
    this.form.patchValue(todo);
  }

  private clearTodo(): void {
    this.selectedTodo.set(null);
    this.form.reset()
  }

  protected deleteTodo(id: string): void {
    if(id !== '0' && id !== null) {
      this.todoService.deleteTodo(id).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(() => {
        this.getTodos();
      })
    }
  }

  private initForm(): void {
    this.form = this.formBuilder.group({
      id: ['0', Validators.required],
      todo: ['', Validators.required],
      completed: [false],
    });
  }
}
